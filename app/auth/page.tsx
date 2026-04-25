import { redirect } from "next/navigation";
import { OwnerAuthForm } from "@/components/auth/owner-auth-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { hasSupabaseAdminEnv, hasSupabaseClientEnv } from "@/lib/env";
import { getOwnerAccessState, hasOwnerProfile } from "@/lib/supabase/queries";

export default async function AuthPage() {
  const [accessState, ownerExists] = await Promise.all([
    getOwnerAccessState(),
    hasOwnerProfile(),
  ]);

  if (accessState.isOwner) {
    redirect("/dashboard");
  }

  const supabaseReady = hasSupabaseClientEnv() && hasSupabaseAdminEnv();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="surface-border overflow-hidden shadow-[0_24px_80px_-46px_rgba(15,23,42,0.8)]">
          <CardHeader className="space-y-5">
            <Badge variant="secondary" className="w-fit">
              Step 3: owner auth
            </Badge>
            <div className="space-y-3">
              <CardTitle className="text-4xl tracking-tight sm:text-5xl">
                Private access for the real owner
              </CardTitle>
              <CardDescription className="max-w-xl text-base leading-7">
                The dashboard is now reserved for a single owner account. Once
                the owner signs up, every dashboard route stays private behind
                Supabase auth.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Single owner", ownerExists ? "Claimed" : "Available"],
                ["Dashboard access", "Protected"],
                ["Session handling", "Middleware refreshed"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-border/70 bg-background/70 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.8rem] border border-border/70 bg-background/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
                Current state
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {ownerExists
                  ? "An owner account already exists, so sign-in is the main path now."
                  : "No owner account exists yet. The first successful sign-up will claim the owner role for this MindClone."}
              </p>
              {!supabaseReady ? (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Supabase env vars are not fully configured yet. Fill in
                  `.env.local` using `.env.example` before testing auth.
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">
                What Step 3 adds
              </p>
              <div className="grid gap-3">
                {[
                  "Email and password owner sign-up",
                  "Email and password owner sign-in",
                  "One owner account enforced at the app level",
                  "Protected dashboard routes with redirects for non-owners",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {!ownerExists ? (
            <OwnerAuthForm mode="sign-up" disabled={!supabaseReady} />
          ) : null}
          <OwnerAuthForm mode="sign-in" disabled={!supabaseReady} />
        </div>
      </div>
    </main>
  );
}
