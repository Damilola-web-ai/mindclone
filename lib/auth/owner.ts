import { normalizePublicLinkSlug } from "@/lib/profile/owner-profile";

const DEFAULT_OWNER_GREETING =
  "Thanks for reaching out. I am still getting set up, but this is officially my MindClone.";

export function normalizeOwnerEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildOwnerDisplayName(email: string) {
  const localPart = normalizeOwnerEmail(email).split("@")[0] ?? "Owner";

  const candidate = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate) {
    return "Owner";
  }

  return candidate.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getDefaultOwnerProfile(email: string) {
  const displayName = buildOwnerDisplayName(email);

  return {
    name: displayName,
    bio: "",
    greeting: DEFAULT_OWNER_GREETING,
    system_prompt: "",
    is_public: true,
    require_visitor_name: false,
    public_link_slug: normalizePublicLinkSlug(displayName, email),
    access_password_hash: null,
  };
}

export function formatAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "That email or password does not match the owner account.";
  }

  if (message.toLowerCase().includes("already registered")) {
    return "That email is already registered. Try signing in instead.";
  }

  if (message.toLowerCase().includes("password")) {
    return message;
  }

  return "Something went wrong while talking to Supabase. Please try again.";
}

export function formatOwnerProfileReservationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("access_password_hash") ||
    (normalizedMessage.includes("owner_profile") &&
      normalizedMessage.includes("column"))
  ) {
    return "Your Supabase schema is missing the latest owner profile column. Run migrations 20260423_000001 through 20260423_000004, especially 20260423_000004_profile_settings.sql, then try creating the owner account again.";
  }

  if (
    normalizedMessage.includes("owner_profile_singleton_idx") ||
    normalizedMessage.includes("duplicate key")
  ) {
    return "An owner profile already exists for this MindClone project. Sign in with the existing owner account instead of creating a new one.";
  }

  if (normalizedMessage.includes("public_link_slug")) {
    return "The owner profile defaults were rejected by the public link slug rules. Update your schema, then try creating the owner account again.";
  }

  return "Supabase created the auth user, but the owner profile insert failed. Make sure all migrations have been applied in order, then try again.";
}
