import type {
  PromptEditorState,
  QuizWorkspaceState,
} from "@/app/dashboard/quiz/actions";
import {
  countCompletedAnswers,
  createEmptyQuizAnswers,
} from "@/lib/personality-quiz";

export function createQuizWorkspaceState(
  input?: Partial<QuizWorkspaceState>,
): QuizWorkspaceState {
  const answers = {
    ...createEmptyQuizAnswers(),
    ...(input?.answers ?? {}),
  };

  return {
    error: input?.error ?? null,
    message: input?.message ?? null,
    answers,
    systemPrompt: input?.systemPrompt ?? "",
    completedCount: input?.completedCount ?? countCompletedAnswers(answers),
  };
}

export function createPromptEditorState(
  input?: Partial<PromptEditorState>,
): PromptEditorState {
  return {
    error: input?.error ?? null,
    message: input?.message ?? null,
    systemPrompt: input?.systemPrompt ?? "",
  };
}
