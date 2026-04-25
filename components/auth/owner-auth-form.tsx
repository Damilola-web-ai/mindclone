"use client";

import { useFormState } from "react-dom";
import { signInOwner, signUpOwner, type AuthActionState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthActionState } from "@/lib/auth/action-state";

type OwnerAuthFormProps = {
  mode: "sign-in" | "sign-up";
  disabled?: boolean;
};

function ErrorMessage({ state }: { state: AuthActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </div>
  );
}

export function OwnerAuthForm({
  mode,
  disabled = false,
}: OwnerAuthFormProps) {
  const isSignIn = mode === "sign-in";
  const [state, action] = useFormState(
    isSignIn ? signInOwner : signUpOwner,
    initialAuthActionState,
  );

  return (
    <Card className="surface-border shadow-[0_18px_60px_-42px_rgba(15,23,42,0.8)]">
      <CardHeader className="space-y-4">
        <Badge variant={isSignIn ? "outline" : "secondary"} className="w-fit">
          {isSignIn ? "Existing owner" : "First-time setup"}
        </Badge>
        <div className="space-y-2">
          <CardTitle className="text-2xl">
            {isSignIn ? "Sign in as the owner" : "Create the owner account"}
          </CardTitle>
          <CardDescription className="leading-6">
            {isSignIn
              ? "Use the owner email and password to unlock the private MindClone dashboard."
              : "This can only happen once. The first successful sign-up permanently claims the owner role for this MindClone."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-email`}>Email</Label>
            <Input
              id={`${mode}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={disabled}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${mode}-password`}>Password</Label>
            <Input
              id={`${mode}-password`}
              name="password"
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              disabled={disabled}
              required
            />
          </div>

          <ErrorMessage state={state} />

          <SubmitButton
            idleLabel={isSignIn ? "Sign in" : "Create owner account"}
            pendingLabel={isSignIn ? "Signing in..." : "Creating owner account..."}
            className="w-full"
          />
        </form>
      </CardContent>
    </Card>
  );
}
