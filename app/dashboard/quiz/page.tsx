import { OwnerQuizWorkspace } from "@/components/dashboard/owner-quiz-workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnerQuizAnswers, getOwnerAccessState } from "@/lib/supabase/queries";

export default async function QuizPage() {
  const [accessState, quizAnswers] = await Promise.all([
    getOwnerAccessState(),
    getOwnerQuizAnswers(),
  ]);

  const ownerName = accessState.ownerProfile?.name || "Owner";
  const systemPrompt = accessState.ownerProfile?.system_prompt ?? "";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Onboarding"
        title="Personality quiz and prompt builder"
        description="The owner quiz is now real. Answers save to Supabase, and once the profile is filled in, MindClone generates a reusable personality core prompt you can edit directly."
      />

      <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              This is the permanent foundation of how the clone thinks and speaks.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Finish the 10 answers, generate the prompt, and fine-tune the
              wording until it sounds unmistakably like you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-400/12 text-emerald-200 hover:bg-emerald-400/12">
              Saved to Supabase
            </Badge>
            <Badge variant="outline" className="border-white/10 text-slate-300">
              Stored on owner profile
            </Badge>
          </div>
        </CardContent>
      </Card>

      <OwnerQuizWorkspace
        initialAnswers={quizAnswers}
        initialSystemPrompt={systemPrompt}
        ownerName={ownerName}
      />
    </div>
  );
}
