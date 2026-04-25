"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  saveCustomSystemPrompt,
  saveOwnerQuiz,
} from "@/app/dashboard/quiz/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import {
  countCompletedAnswers,
  getQuestionsForStep,
  ownerQuizQuestions,
  ownerQuizSteps,
  type QuizAnswers,
} from "@/lib/personality-quiz";
import {
  createPromptEditorState,
  createQuizWorkspaceState,
} from "@/lib/quiz/action-state";
import { cn } from "@/lib/utils";

type OwnerQuizWorkspaceProps = {
  initialAnswers: QuizAnswers;
  initialSystemPrompt: string;
  ownerName: string;
};

export function OwnerQuizWorkspace({
  initialAnswers,
  initialSystemPrompt,
  ownerName,
}: OwnerQuizWorkspaceProps) {
  const toast = useToast();
  const previousPromptFeedbackRef = useRef<string | null>(null);
  const previousQuizFeedbackRef = useRef<string | null>(null);
  const [answers, setAnswers] = useState(initialAnswers);
  const [activeStep, setActiveStep] = useState(() => {
    const firstIncompleteStep = ownerQuizSteps.find((step) => {
      return getQuestionsForStep(step.id).some((question) => {
        return !initialAnswers[question.id]?.trim();
      });
    });

    return firstIncompleteStep?.id ?? ownerQuizSteps[0]?.id ?? "voice";
  });
  const [promptDraft, setPromptDraft] = useState(initialSystemPrompt);

  const [quizState, quizAction] = useFormState(
    saveOwnerQuiz,
    createQuizWorkspaceState({
      answers: initialAnswers,
      systemPrompt: initialSystemPrompt,
    }),
  );
  const [promptState, promptAction] = useFormState(
    saveCustomSystemPrompt,
    createPromptEditorState({
      systemPrompt: initialSystemPrompt,
    }),
  );

  useEffect(() => {
    setAnswers(quizState.answers);

    if (quizState.systemPrompt) {
      setPromptDraft(quizState.systemPrompt);
    }
  }, [quizState.answers, quizState.systemPrompt]);

  useEffect(() => {
    if (promptState.systemPrompt) {
      setPromptDraft(promptState.systemPrompt);
    }
  }, [promptState.systemPrompt]);

  useEffect(() => {
    const feedback = quizState.error
      ? {
          description: quizState.error,
          key: `error:${quizState.error}`,
          title: "Quiz changes not saved",
          tone: "error" as const,
        }
      : quizState.message
        ? {
            description: quizState.message,
            key: `success:${quizState.message}`,
            title: "Quiz progress saved",
            tone: "success" as const,
          }
        : null;

    if (!feedback || previousQuizFeedbackRef.current === feedback.key) {
      return;
    }

    previousQuizFeedbackRef.current = feedback.key;
    toast(feedback);
  }, [quizState.error, quizState.message, toast]);

  useEffect(() => {
    const feedback = promptState.error
      ? {
          description: promptState.error,
          key: `error:${promptState.error}`,
          title: "Prompt not saved",
          tone: "error" as const,
        }
      : promptState.message
        ? {
            description: promptState.message,
            key: `success:${promptState.message}`,
            title: "Prompt saved",
            tone: "success" as const,
          }
        : null;

    if (!feedback || previousPromptFeedbackRef.current === feedback.key) {
      return;
    }

    previousPromptFeedbackRef.current = feedback.key;
    toast(feedback);
  }, [promptState.error, promptState.message, toast]);

  const completedCount = countCompletedAnswers(answers);
  const currentStepIndex = ownerQuizSteps.findIndex((step) => step.id === activeStep);
  const currentStep = ownerQuizSteps[currentStepIndex] ?? ownerQuizSteps[0];
  const currentQuestions = getQuestionsForStep(currentStep.id);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === ownerQuizSteps.length - 1;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-emerald-400/12 text-emerald-200 hover:bg-emerald-400/12">
              Multi-step onboarding
            </Badge>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-400">
              {completedCount} / {ownerQuizQuestions.length} answered
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {ownerQuizSteps.map((step, index) => {
              const stepQuestions = getQuestionsForStep(step.id);
              const answeredCount = stepQuestions.filter((question) => {
                return Boolean(answers[question.id]?.trim());
              }).length;
              const isActive = step.id === activeStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "rounded-[1.5rem] border p-4 text-left transition-colors",
                    isActive
                      ? "border-emerald-300/20 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-3 text-sm font-medium text-white">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {answeredCount}/{stepQuestions.length} answered
                  </p>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">
              {currentStep.title}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              {currentStep.description}
            </p>
          </div>

          <form action={quizAction} className="space-y-5">
            {ownerQuizQuestions.map((question) => (
              <input
                key={question.id}
                type="hidden"
                name={`quiz_${question.id}`}
                value={answers[question.id] ?? ""}
              />
            ))}

            {currentQuestions.map((question) => (
              <div
                key={question.id}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-5"
              >
                <p className="text-sm font-medium text-white">
                  {ownerQuizQuestions.findIndex((item) => item.id === question.id) + 1}.{" "}
                  {question.question}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {question.helper}
                </p>
                <Textarea
                  className="mt-4 min-h-[150px] border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
                  placeholder={question.placeholder}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [question.id]: nextValue,
                    }));
                  }}
                />
              </div>
            ))}

            {quizState.error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {quizState.error}
              </div>
            ) : null}

            {quizState.message ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {quizState.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                  onClick={() => {
                    if (!isFirstStep) {
                      setActiveStep(ownerQuizSteps[currentStepIndex - 1].id);
                    }
                  }}
                  disabled={isFirstStep}
                >
                  Previous
                </Button>
                {!isLastStep ? (
                  <Button
                    type="button"
                    className="bg-white text-slate-900 hover:bg-white/90"
                    onClick={() => {
                      setActiveStep(ownerQuizSteps[currentStepIndex + 1].id);
                    }}
                  >
                    Next step
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <SubmitButton
                  idleLabel="Save progress"
                  pendingLabel="Saving..."
                  className="bg-white/10 text-white hover:bg-white/15"
                />
                <button
                  type="submit"
                  name="intent"
                  value="generate"
                  className={buttonVariants({
                    className:
                      "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
                  })}
                  disabled={completedCount < ownerQuizQuestions.length}
                >
                  Save and generate prompt
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardTitle className="text-white">Personality core status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Owner
              </p>
              <p className="mt-3 text-lg font-medium text-white">{ownerName}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Completion
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {completedCount}/{ownerQuizQuestions.length}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Prompt status
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {promptDraft.trim()
                    ? "A stored system prompt exists and can be edited below."
                    : "Generate the system prompt once all answers are filled in."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader className="space-y-3">
            <CardTitle className="text-white">Editable system prompt</CardTitle>
            <p className="text-sm leading-6 text-slate-400">
              The generated prompt is stored on the owner profile and can be
              refined manually anytime from here.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={promptAction} className="space-y-4">
              <Textarea
                name="systemPrompt"
                className="min-h-[360px] border-white/10 bg-[#06111d] font-mono text-[13px] leading-7 text-slate-100 placeholder:text-slate-500"
                placeholder="Your generated personality core prompt will appear here once the quiz is complete."
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
              />

              {promptState.error ? (
                <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {promptState.error}
                </div>
              ) : null}

              {promptState.message ? (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {promptState.message}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-400">
                  Tip: generate first, then make small edits instead of rewriting the whole prompt from scratch.
                </p>
                <SubmitButton
                  idleLabel="Save custom prompt"
                  pendingLabel="Saving prompt..."
                />
              </div>
            </form>

            <Separator className="bg-white/10" />

            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Why this matters
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The system prompt becomes the personality core layer used on
                every future Gemini call, alongside memory retrieval and live
                corrections.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
