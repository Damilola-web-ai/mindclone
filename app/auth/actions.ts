"use server";

import { redirect } from "next/navigation";
import {
  formatAuthErrorMessage,
  formatOwnerProfileReservationError,
  getDefaultOwnerProfile,
  normalizeOwnerEmail,
} from "@/lib/auth/owner";
import {
  hasSupabaseAdminEnv,
  hasSupabaseClientEnv,
} from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasOwnerProfile } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
};

function readCredentials(formData: FormData) {
  const email = normalizeOwnerEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      email,
      password,
      error: "Please enter both an email and password.",
    };
  }

  if (password.length < 8) {
    return {
      email,
      password,
      error: "Password must be at least 8 characters long.",
    };
  }

  return {
    email,
    password,
    error: null,
  };
}

export async function signInOwner(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseClientEnv()) {
    return {
      error:
        "Supabase environment variables are missing. Fill in .env.local before signing in.",
    };
  }

  const credentials = readCredentials(formData);

  if (credentials.error) {
    return { error: credentials.error };
  }

  const supabase = getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (signInError) {
    return { error: formatAuthErrorMessage(signInError.message) };
  }

  const { data: ownerProfile, error: ownerError } = await supabase
    .from("owner_profile")
    .select("id")
    .maybeSingle();

  if (ownerError || !ownerProfile) {
    await supabase.auth.signOut();
    return {
      error:
        "This account is not the MindClone owner account. Sign in with the owner email instead.",
    };
  }

  redirect("/dashboard");
}

export async function signUpOwner(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseClientEnv() || !hasSupabaseAdminEnv()) {
    return {
      error:
        "Supabase is not fully configured yet. Add the project URL, anon key, and service role key first.",
    };
  }

  const credentials = readCredentials(formData);

  if (credentials.error) {
    return { error: credentials.error };
  }

  if (await hasOwnerProfile()) {
    return {
      error:
        "An owner account already exists for this MindClone. Sign in instead of creating another one.",
    };
  }

  const admin = getSupabaseAdminClient();
  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: {
        role: "owner",
      },
    });

  if (createUserError || !createdUser.user) {
    return {
      error: formatAuthErrorMessage(createUserError?.message ?? "Could not create owner account."),
    };
  }

  const { error: ownerProfileError } = await admin.from("owner_profile").insert({
    auth_user_id: createdUser.user.id,
    ...getDefaultOwnerProfile(credentials.email),
  });

  if (ownerProfileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);

    return {
      error: formatOwnerProfileReservationError(ownerProfileError.message),
    };
  }

  const supabase = getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (signInError) {
    return {
      error:
        "The owner account was created, but automatic sign-in failed. Please sign in manually.",
    };
  }

  redirect("/dashboard");
}

export async function signOutOwner() {
  if (hasSupabaseClientEnv()) {
    const supabase = getSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/auth");
}
