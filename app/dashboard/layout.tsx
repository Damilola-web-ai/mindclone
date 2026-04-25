import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutOwner } from "@/app/auth/actions";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOwnerAccessState } from "@/lib/supabase/queries";

export const runtime = "nodejs";
export const preferredRegion = "home";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile || !accessState.user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-[#08111d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-[#07101a] lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r">
          <div className="space-y-6 p-4 sm:p-6">
            <div className="space-y-4">
              <Badge className="bg-emerald-400/12 text-emerald-200 hover:bg-emerald-400/12">
                Owner workspace
              </Badge>
              <div>
                <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
                  MindClone
                </Link>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Signed in as the protected owner account. The Supabase auth
                  foundation and dashboard protection are now live.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Current build state
              </p>
              <p className="mt-3 text-base font-medium text-white">
                Step 12 complete
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                App Router scaffolding, Supabase auth, owner-only route
                protection, stored quiz answers, memory ingestion, public chat,
                private mode, correction rules, analytics, and the real profile
                settings controls are all in place. Deployment prep now adds
                health checks, Vercel rollout scripts, environment validation,
                and runtime guardrails for the slowest routes.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/10 bg-emerald-400/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Signed-in owner
              </p>
              <p className="mt-3 text-base font-medium text-white">
                {accessState.ownerProfile.name || "Owner"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {accessState.user.email ?? "Owner email unavailable"}
              </p>
            </div>

            <DashboardNav />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08111d]/88 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
                  Owner dashboard
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Protected access, stored onboarding, memory ingestion, and the
                  public RAG chat experience are now live. Deployment prep is
                  complete too, so this codebase is ready for a real Vercel
                  rollout once production credentials are connected.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
                  {accessState.user.email}
                </div>
                <form action={signOutOwner}>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/15"
                  >
                    Sign out
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="safe-pb flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
