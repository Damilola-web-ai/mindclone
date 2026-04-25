import Link from "next/link";
import { AnalyticsWorkspace } from "@/components/dashboard/analytics-workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { getPublicAnalyticsSnapshot } from "@/lib/analytics/public-analytics";
import { getMemorySourceLabel } from "@/lib/parsers/source-config";

export const dynamic = "force-dynamic";

function truncateValue(value: string, maxLength = 20) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

export default async function AnalyticsPage() {
  const analyticsSnapshot = await getPublicAnalyticsSnapshot();
  const topSourceValue = analyticsSnapshot.topSource
    ? truncateValue(analyticsSnapshot.topSource.sourceName)
    : "No source yet";
  const topSourceHint = analyticsSnapshot.topSource
    ? `${getMemorySourceLabel(analyticsSnapshot.topSource.sourceType)} used ${
        analyticsSnapshot.topSource.usageCount
      } times across ${analyticsSnapshot.topSource.conversationCount} public conversation${
        analyticsSnapshot.topSource.conversationCount === 1 ? "" : "s"
      }.`
    : "Source usage appears after visitor replies start grounding themselves in stored memory.";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Visitor insights dashboard"
        description="This page turns stored public conversations into real owner analytics: visitor volume, message totals, recurring themes, full transcripts, and which memories are grounding replies most often."
        actions={
          <Link href="/dashboard/corrections" className={buttonVariants()}>
            Open corrections workspace
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total visitors"
          value={String(analyticsSnapshot.totalVisitors)}
          hint={`${analyticsSnapshot.totalPublicConversations} public conversation${
            analyticsSnapshot.totalPublicConversations === 1 ? "" : "s"
          } saved so far. Named visitors are deduped; anonymous chats count per thread.`}
        />
        <StatCard
          label="Total messages"
          value={String(analyticsSnapshot.totalMessages)}
          hint={`${analyticsSnapshot.userMessageCount} visitor prompt${
            analyticsSnapshot.userMessageCount === 1 ? "" : "s"
          } and ${analyticsSnapshot.assistantMessageCount} clone repl${
            analyticsSnapshot.assistantMessageCount === 1 ? "y" : "ies"
          } across public chats.`}
        />
        <StatCard
          label="Top memory source"
          value={topSourceValue}
          hint={topSourceHint}
        />
      </div>

      <AnalyticsWorkspace
        recentConversations={analyticsSnapshot.recentConversations}
        sourceUsage={analyticsSnapshot.sourceUsage}
        topicInsights={analyticsSnapshot.topicInsights}
        topicSummaryMode={analyticsSnapshot.topicSummaryMode}
      />
    </div>
  );
}
