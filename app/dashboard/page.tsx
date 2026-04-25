import Link from "next/link";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardMilestones } from "@/lib/mindclone-content";
import {
  getCorrectionsLog,
  getPublicConversationReviews,
  getUploadedSources,
} from "@/lib/supabase/queries";

export default async function DashboardPage() {
  const [conversations, uploadedSources, corrections] = await Promise.all([
    getPublicConversationReviews(100),
    getUploadedSources(),
    getCorrectionsLog(100),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Control center"
        title="Owner overview"
        description="This is the private MindClone workspace. The owner auth flow, protected dashboard access, stored onboarding quiz, training pipeline, visitor chat experience, private assistant mode, correction system, analytics dashboard, public profile settings, and deployment prep are all in place now."
        actions={
          <Link href="/dashboard/settings" className={buttonVariants()}>
            Open settings workspace
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Visitors"
          value={String(conversations.length)}
          hint="Public conversations now save into Supabase and feed the live analytics dashboard."
        />
        <StatCard
          label="Memories"
          value={String(uploadedSources.length)}
          hint="Uploads now flow through parsing, chunking, and pgvector storage on the training route."
        />
        <StatCard
          label="Corrections"
          value={String(corrections.length)}
          hint="Visitor transcripts can now be reviewed and turned into durable correction rules."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">Roadmap</CardDescription>
            <CardTitle className="text-white">Build order after the foundation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardMilestones.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    {item.step}: {item.title}
                  </p>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <EmptyStateCard
            title="Ready for rollout"
            description="The core product loop is fully wired now: owner onboarding, training, public chat, private mode, corrections, analytics, settings, polish, and Vercel deployment prep all connect to real data."
            hint="Connect the real Vercel project, add production env vars, and use the deployment docs plus /api/health to ship safely."
          />
          <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
            <CardHeader>
              <CardDescription className="text-slate-400">
                Quick links
              </CardDescription>
              <CardTitle className="text-white">
                Jump into the next owner surfaces
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ["/dashboard/quiz", "Personality onboarding"],
                ["/dashboard/train", "Memory training"],
                ["/dashboard/private", "Private assistant mode"],
                ["/dashboard/corrections", "Correction log"],
                ["/dashboard/settings", "Public profile settings"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-2 font-mono text-xs text-emerald-300/80">{href}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
