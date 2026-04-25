import { OwnerPrivateWorkspace } from "@/components/dashboard/owner-private-workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  getConversationMessagesById,
  getLatestConversationByScope,
  getOwnerAccessState,
  getOwnerNotes,
} from "@/lib/supabase/queries";

export default async function PrivateModePage() {
  const [accessState, ownerNotes, latestConversation] = await Promise.all([
    getOwnerAccessState(),
    getOwnerNotes(),
    getLatestConversationByScope("owner_private"),
  ]);
  const latestMessages = latestConversation
    ? await getConversationMessagesById(latestConversation.id)
    : [];
  const activeTasks = ownerNotes.filter(
    (note) => note.type === "task" && !note.is_complete,
  ).length;
  const activeReminders = ownerNotes.filter(
    (note) => note.type === "reminder" && !note.is_complete,
  ).length;
  const activeNotes = ownerNotes.filter((note) => !note.is_complete).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Private mode"
        title="Owner-only assistant workspace"
        description="This is the private version of MindClone for the real owner. It uses the same memory bank and personality core, but it can also see your current notes, tasks, and reminders so it can help you think, decide, and prioritize."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Active tasks"
          value={String(activeTasks)}
          hint="Current to-dos the private assistant can help prioritize."
        />
        <StatCard
          label="Reminders"
          value={String(activeReminders)}
          hint="Time-sensitive prompts available inside private mode."
        />
        <StatCard
          label="Private context"
          value={String(activeNotes)}
          hint="Open notes, tasks, and reminders available to the owner-only assistant."
        />
      </div>

      <OwnerPrivateWorkspace
        initialConversationId={latestConversation?.id ?? null}
        initialMessages={latestMessages}
        initialNotes={ownerNotes}
        ownerName={accessState.ownerProfile?.name ?? "Owner"}
      />
    </div>
  );
}
