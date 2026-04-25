import { CorrectionsWorkspace } from "@/components/dashboard/corrections-workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  getCorrectionsLog,
  getPublicConversationReviews,
} from "@/lib/supabase/queries";

export default async function CorrectionsPage() {
  const [conversations, corrections] = await Promise.all([
    getPublicConversationReviews(12),
    getCorrectionsLog(50),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reinforcement"
        title="Corrections workspace"
        description="Review real visitor transcripts, flag a weak clone reply, and save the version you would actually say. Every saved correction becomes part of MindClone's durable behavior rules."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Public transcripts"
          value={String(conversations.length)}
          hint="Recent visitor conversations available for review."
        />
        <StatCard
          label="Saved corrections"
          value={String(corrections.length)}
          hint="Durable behavior rules currently influencing future answers."
        />
        <StatCard
          label="Ready to reinforce"
          value={conversations.length > 0 ? "Yes" : "No"}
          hint="Assistant replies in each visitor transcript can now be turned into corrections."
        />
      </div>

      <CorrectionsWorkspace
        conversations={conversations}
        corrections={corrections}
      />
    </div>
  );
}
