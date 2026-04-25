import { NextResponse, type NextRequest } from "next/server";
import {
  buildVisitorAccessCookieValue,
  getVisitorAccessCookieName,
  verifyVisitorAccessPassword,
} from "@/lib/chat/public-access";
import { getPublicChatOwnerProfile } from "@/lib/chat/public-chat";
import { hasSupabaseAdminEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const maxDuration = 15;

type PublicAccessRequestBody = {
  password?: string;
  slug?: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminEnv()) {
    return jsonError(
      "MindClone needs Supabase admin access before private visitor links can unlock.",
      503,
    );
  }

  let body: PublicAccessRequestBody;

  try {
    body = (await request.json()) as PublicAccessRequestBody;
  } catch {
    return jsonError("The unlock request body could not be read.", 400);
  }

  const slug = normalizeOptionalText(body.slug);
  const password = normalizeOptionalText(body.password);

  const ownerProfile = await getPublicChatOwnerProfile(slug);

  if (!ownerProfile) {
    return jsonError("This MindClone link is not available right now.", 404);
  }

  if (ownerProfile.is_public) {
    return NextResponse.json({ status: "public" });
  }

  if (!ownerProfile.access_password_hash) {
    return jsonError("This private MindClone link has not been configured yet.", 403);
  }

  if (!password) {
    return jsonError("Enter the owner password to unlock this chat.", 400);
  }

  const isPasswordValid = verifyVisitorAccessPassword(
    password,
    ownerProfile.access_password_hash,
  );

  if (!isPasswordValid) {
    return jsonError("That password is not correct for this private link.", 403);
  }

  const response = NextResponse.json({ status: "unlocked" });
  response.cookies.set({
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    name: getVisitorAccessCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: buildVisitorAccessCookieValue(
      ownerProfile.id,
      ownerProfile.access_password_hash,
    ),
  });

  return response;
}
