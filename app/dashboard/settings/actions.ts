"use server";

import { revalidatePath } from "next/cache";
import { getOptionalAppUrl, hasSupabaseAdminEnv } from "@/lib/env";
import { hashVisitorAccessPassword } from "@/lib/chat/public-access";
import { buildOwnerPhotoStoragePath, buildPublicSharePath, buildPublicShareUrl, normalizePublicLinkSlug } from "@/lib/profile/owner-profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOwnerAccessState } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OwnerSettingsProfileSnapshot = {
  bio: string;
  greeting: string;
  hasAccessPassword: boolean;
  id: string;
  isPublic: boolean;
  name: string;
  photoUrl: string | null;
  publicLinkSlug: string | null;
  requireVisitorName: boolean;
  sharePath: string;
  shareUrl: string;
};

export type SaveOwnerSettingsResult =
  | {
      message: string;
      profile: OwnerSettingsProfileSnapshot;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

type SaveOwnerSettingsInput = {
  accessPassword?: string;
  bio: string;
  clearAccessPassword?: boolean;
  greeting: string;
  isPublic: boolean;
  name: string;
  photoUrl?: string | null;
  publicLinkSlug?: string;
  removePhoto?: boolean;
  requireVisitorName: boolean;
};

function trimText(value?: string | null) {
  return value?.trim() ?? "";
}

function formatSettingsErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("owner_profile_public_link_slug_key")) {
    return "That public link slug is already taken. Try a different variation.";
  }

  if (normalizedMessage.includes("owner_profile_slug_format")) {
    return "Your public link can only use lowercase letters, numbers, and hyphens.";
  }

  return "Something went wrong while saving the owner settings.";
}

function buildSettingsSnapshot(input: {
  bio: string;
  greeting: string;
  hasAccessPassword: boolean;
  id: string;
  isPublic: boolean;
  name: string;
  photoUrl: string | null;
  publicLinkSlug: string | null;
  requireVisitorName: boolean;
}) {
  return {
    bio: input.bio,
    greeting: input.greeting,
    hasAccessPassword: input.hasAccessPassword,
    id: input.id,
    isPublic: input.isPublic,
    name: input.name,
    photoUrl: input.photoUrl,
    publicLinkSlug: input.publicLinkSlug,
    requireVisitorName: input.requireVisitorName,
    sharePath: buildPublicSharePath(input.publicLinkSlug),
    shareUrl: buildPublicShareUrl(getOptionalAppUrl(), input.publicLinkSlug),
  } satisfies OwnerSettingsProfileSnapshot;
}

export async function saveOwnerSettings(
  input: SaveOwnerSettingsInput,
): Promise<SaveOwnerSettingsResult> {
  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile) {
    return {
      message: "Only the signed-in owner can update these settings.",
      status: "error",
    };
  }

  const currentProfile = accessState.ownerProfile;
  const name = trimText(input.name);
  const bio = trimText(input.bio);
  const greeting = trimText(input.greeting);
  const normalizedSlug = normalizePublicLinkSlug(input.publicLinkSlug, name);
  const nextPhotoUrl = input.removePhoto ? null : trimText(input.photoUrl) || null;
  const accessPassword = trimText(input.accessPassword);

  if (name.length < 2) {
    return {
      message: "Display name should be at least 2 characters long.",
      status: "error",
    };
  }

  if (bio.length > 280) {
    return {
      message: "Keep the public bio under 280 characters.",
      status: "error",
    };
  }

  if (greeting.length > 500) {
    return {
      message: "Keep the greeting under 500 characters.",
      status: "error",
    };
  }

  if (accessPassword && accessPassword.length < 6) {
    return {
      message: "Private-link passwords should be at least 6 characters long.",
      status: "error",
    };
  }

  let nextPasswordHash = currentProfile.access_password_hash;

  if (input.clearAccessPassword) {
    nextPasswordHash = null;
  }

  if (accessPassword) {
    nextPasswordHash = hashVisitorAccessPassword(accessPassword);
  }

  if (!input.isPublic && !nextPasswordHash) {
    return {
      message: "Private links need a password before visitors can unlock the chat.",
      status: "error",
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_profile")
    .update({
      access_password_hash: nextPasswordHash,
      bio,
      greeting,
      is_public: input.isPublic,
      name,
      photo_url: nextPhotoUrl,
      public_link_slug: normalizedSlug,
      require_visitor_name: input.requireVisitorName,
    })
    .eq("id", currentProfile.id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      message: formatSettingsErrorMessage(error?.message ?? ""),
      status: "error",
    };
  }

  if (input.removePhoto && currentProfile.photo_url && hasSupabaseAdminEnv()) {
    const admin = getSupabaseAdminClient();

    await admin.storage
      .from("profile-photos")
      .remove([buildOwnerPhotoStoragePath(currentProfile.id)]);
  }

  revalidatePath("/");
  revalidatePath("/chat");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  const previousSharePath = buildPublicSharePath(currentProfile.public_link_slug);
  const nextSharePath = buildPublicSharePath(normalizedSlug);
  revalidatePath(previousSharePath);
  revalidatePath(nextSharePath);

  return {
    message: input.isPublic
      ? "Public profile settings saved. Your visitor link is live."
      : "Private profile settings saved. Visitors now need the password you set.",
    profile: buildSettingsSnapshot({
      bio: data.bio,
      greeting: data.greeting,
      hasAccessPassword: Boolean(data.access_password_hash),
      id: data.id,
      isPublic: data.is_public,
      name: data.name,
      photoUrl: data.photo_url,
      publicLinkSlug: data.public_link_slug,
      requireVisitorName: data.require_visitor_name,
    }),
    status: "success",
  };
}
