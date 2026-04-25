"use server";

import { revalidatePath } from "next/cache";
import {
  buildPersonalitySystemPrompt,
  countCompletedAnswers,
  createEmptyQuizAnswers,
  ownerQuizQuestions,
  type QuizAnswers,
} from "@/lib/personality-quiz";
import {
  createPromptEditorState,
  createQuizWorkspaceState,
} from "@/lib/quiz/action-state";
import { getOwnerAccessState } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type QuizWorkspaceState = {
  error: string | null;
  message: string | null;
  answers: QuizAnswers;
  systemPrompt: string;
  completedCount: number;
};

function readQuizAnswersFromFormData(formData: FormData): QuizAnswers {
  return ownerQuizQuestions.reduce<QuizAnswers>((accumulator, question) => {
    accumulator[question.id] = String(
      formData.get(`quiz_${question.id}`) ?? "",
    ).trim();

    return accumulator;
  }, createEmptyQuizAnswers());
}

function getIntent(formData: FormData) {
  const intent = String(formData.get("intent") ?? "save");
  return intent === "generate" ? "generate" : "save";
}

export async function saveOwnerQuiz(
  _: QuizWorkspaceState,
  formData: FormData,
): Promise<QuizWorkspaceState> {
  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile) {
    return createQuizWorkspaceState({
      error: "Only the signed-in owner can update the quiz.",
    });
  }

  const answers = readQuizAnswersFromFormData(formData);
  const completedCount = countCompletedAnswers(answers);
  const intent = getIntent(formData);

  if (intent === "generate" && completedCount < ownerQuizQuestions.length) {
    return createQuizWorkspaceState({
      answers,
      completedCount,
      systemPrompt: accessState.ownerProfile.system_prompt,
      error:
        "Complete all 10 quiz answers before generating the personality core prompt.",
    });
  }

  const supabase = getSupabaseServerClient();
  const quizRows = ownerQuizQuestions.map((question) => ({
    question: question.question,
    answer: answers[question.id] ?? "",
  }));

  const { error: saveQuizError } = await supabase
    .from("personality_quiz")
    .upsert(quizRows, { onConflict: "question" });

  if (saveQuizError) {
    return createQuizWorkspaceState({
      answers,
      completedCount,
      systemPrompt: accessState.ownerProfile.system_prompt,
      error: "Could not save the quiz answers to Supabase. Please try again.",
    });
  }

  let systemPrompt = accessState.ownerProfile.system_prompt;
  let message = "Quiz progress saved.";

  if (intent === "generate") {
    systemPrompt = buildPersonalitySystemPrompt({
      ownerName: accessState.ownerProfile.name,
      answers,
    });

    const { error: updatePromptError } = await supabase
      .from("owner_profile")
      .update({ system_prompt: systemPrompt })
      .eq("id", accessState.ownerProfile.id);

    if (updatePromptError) {
      return createQuizWorkspaceState({
        answers,
        completedCount,
        systemPrompt: accessState.ownerProfile.system_prompt,
        error:
          "The quiz answers were saved, but the system prompt could not be updated.",
      });
    }

    message = "Quiz saved and personality core prompt regenerated.";
  }

  revalidatePath("/dashboard/quiz");

  return createQuizWorkspaceState({
    answers,
    completedCount,
    systemPrompt,
    message,
  });
}

export type PromptEditorState = {
  error: string | null;
  message: string | null;
  systemPrompt: string;
};

export async function saveCustomSystemPrompt(
  _: PromptEditorState,
  formData: FormData,
): Promise<PromptEditorState> {
  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile) {
    return createPromptEditorState({
      error: "Only the signed-in owner can edit the personality core prompt.",
    });
  }

  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();

  if (!systemPrompt) {
    return createPromptEditorState({
      error: "The system prompt cannot be empty.",
      systemPrompt: accessState.ownerProfile.system_prompt,
    });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("owner_profile")
    .update({ system_prompt: systemPrompt })
    .eq("id", accessState.ownerProfile.id);

  if (error) {
    return createPromptEditorState({
      error: "Could not save the custom system prompt right now.",
      systemPrompt: accessState.ownerProfile.system_prompt,
    });
  }

  revalidatePath("/dashboard/quiz");

  return createPromptEditorState({
    message: "Custom system prompt saved.",
    systemPrompt,
  });
}
