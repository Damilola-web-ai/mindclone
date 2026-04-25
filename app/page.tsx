import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dashboardMilestones, personalityLayers } from "@/lib/mindclone-content";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="pb-20">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-12 px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Steps 1 to 12 complete</Badge>
              <span className="rounded-full border border-brand/20 bg-white/65 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Next.js 14 + deployment-ready Vercel handoff
              </span>
            </div>

            <div className="space-y-5">
              <p className="max-w-xl text-sm font-semibold uppercase tracking-[0.32em] text-brand">
                Build a version of you that feels unmistakably personal
              </p>
              <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                MindClone turns your memories, style, and voice into a living
                conversation.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                The app now has its visual foundation, Supabase backend layer,
                a real owner auth flow, and a stored personality onboarding
                system. The training pipeline, public visitor chat, and
                owner-only private assistant mode are live too, and saved
                corrections now sharpen future replies. Visitor analytics and
                live public settings are in place too, and the polish pass now
                adds toasts, richer loading states, and tighter mobile behavior
                across the app. The final deployment layer now adds release
                scripts, a health endpoint, Vercel-friendly runtime limits, and
                launch docs.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/chat" className={buttonVariants({ size: "lg" })}>
                Open visitor prototype
              </Link>
              <Link
                href="/auth"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Owner access
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["3 identity layers", "Quiz, memory, and correction loops"],
                ["11 route surfaces", "Dashboard, chat, private mode, and training surfaces are now live"],
                ["Settings live", "Display name, photo, greeting, slug, visitor rules, and private link controls now affect the real public page"],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="surface-border rounded-3xl px-5 py-4 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)]"
                >
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-white/70 bg-slate-950 text-slate-100 shadow-[0_28px_90px_-44px_rgba(15,23,42,0.85)]">
            <CardHeader className="border-b border-white/10 bg-dashboard-glow">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardDescription className="text-slate-400">
                    Owner dashboard preview
                  </CardDescription>
                  <CardTitle className="mt-2 text-2xl text-white">
                    Personal memory operating system
                  </CardTitle>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Private owner view
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Training inputs
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">4 source types</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    WhatsApp exports, journals, voice notes, and archives all
                    feed the memory bank.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Personality setup
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    10 onboarding prompts
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Every answer becomes part of the voice model that visitors
                    experience.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Current build order
                    </p>
                    <p className="text-sm text-slate-400">
                      The backend, auth, onboarding, training, visitor chat,
                      settings, polish, and deployment-prep layers are
                      finished. The next move is connecting real production
                      credentials and pushing the rollout live.
                    </p>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/15">
                    Release-ready
                  </Badge>
                </div>
                <div className="mt-5 space-y-3">
                  {dashboardMilestones.slice(0, 12).map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                    >
                      <div
                        className={cn(
                          "mt-1 h-2.5 w-2.5 rounded-full",
                          item.status === "complete"
                            ? "bg-emerald-400"
                            : item.status === "next"
                              ? "bg-amber-300"
                              : "bg-slate-600",
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.step}: {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="surface-border shadow-[0_20px_70px_-50px_rgba(15,23,42,0.7)]">
            <CardHeader>
              <CardDescription>How the brain is layered</CardDescription>
              <CardTitle className="text-3xl">Three sources of identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {personalityLayers.map((layer) => (
                <div
                  key={layer.name}
                  className="rounded-3xl border border-border/70 bg-background/75 p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
                    {layer.name}
                  </p>
                  <p className="mt-3 text-base font-medium text-foreground">
                    {layer.description}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {layer.detail}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="surface-border shadow-[0_20px_70px_-50px_rgba(15,23,42,0.7)]">
            <CardHeader>
              <CardDescription>Foundation map</CardDescription>
              <CardTitle className="text-3xl">Routes ready for the next build steps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {[
                ["/chat", "Public chat route with the real profile card, live streaming, and visitor access rules."],
                ["/dashboard", "Owner command center with responsive sidebar scaffolding."],
                ["/dashboard/train", "Upload, parsing, chunking, and memory storage workspace."],
                ["/dashboard/quiz", "Personality onboarding with saved answers and prompt generation."],
                ["/dashboard/private", "Owner-only assistant mode with notes, tasks, and reminders."],
                ["/dashboard/corrections", "Correction log structure for voice reinforcement."],
                ["/dashboard/analytics", "Live visitor stats, topic summaries, transcript review, and source usage."],
                ["/dashboard/settings", "Real public profile settings with photo upload, slug control, and private-link password gating."],
              ].map(([route, description]) => (
                <div
                  key={route}
                  className="rounded-3xl border border-border/70 bg-background/70 p-5"
                >
                  <p className="font-mono text-sm text-brand">{route}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="surface-border rounded-[2rem] p-6 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.8)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand">
                Launch status
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                MindClone is now ready for a real Vercel rollout once the
                production project, env vars, and Supabase instance are wired in.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className={buttonVariants({ variant: "outline" })}>
                Open owner auth
              </Link>
              <Link href="/dashboard" className={buttonVariants()}>
                Open dashboard
              </Link>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid gap-4 sm:grid-cols-3">
            {dashboardMilestones.slice(0, 12).map((item) => (
              <div key={item.step} className="rounded-3xl bg-secondary/60 p-5">
                <p className="text-sm font-semibold text-foreground">{item.step}</p>
                <p className="mt-2 text-lg font-medium text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
