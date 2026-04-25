import type { NextRequest } from "next/server";
import { getVisitorAccessCookieName, hasValidVisitorAccessCookie } from "@/lib/chat/public-access";
import { createGeminiTextStream } from "@/lib/chat/gemini-stream";
import {
  createPublicConversation,
  getConversationMessages,
  getConversationRecord,
  getPublicChatOwnerProfile,
  getStoredCorrections,
  insertConversationMessage,
  recordMessageMemoryCitations,
  searchRelevantMemories,
  updateConversationVisitorName,
} from "@/lib/chat/public-chat";
import { buildPublicSystemPrompt } from "@/lib/chat/public-prompt";
import { hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const maxDuration = 90;

type PublicChatRequestBody = {
  conversationId?: string;
  message?: string;
  slug?: string | null;
  visitorName?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminEnv() || !hasGeminiEnv()) {
    return jsonError(
      "MindClone chat needs Supabase admin access and a Gemini API key before it can answer visitors.",
      503,
    );
  }

  let body: PublicChatRequestBody;

  try {
    body = (await request.json()) as PublicChatRequestBody;
  } catch {
    return jsonError("The chat request body could not be read.", 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  const visitorName = normalizeOptionalText(body.visitorName);
  const slug = normalizeOptionalText(body.slug);

  if (!message) {
    return jsonError("Write a message before sending.", 400);
  }

  if (message.length > 4000) {
    return jsonError("Keep messages under 4,000 characters for now.", 400);
  }

  const ownerProfile = await getPublicChatOwnerProfile(slug);

  if (!ownerProfile) {
    return jsonError("This MindClone link is not available right now.", 404);
  }

  const hasVisitorAccess =
    ownerProfile.is_public ||
    hasValidVisitorAccessCookie({
      cookieValue: request.cookies.get(getVisitorAccessCookieName())?.value,
      ownerProfileId: ownerProfile.id,
      passwordHash: ownerProfile.access_password_hash,
    });

  if (!hasVisitorAccess) {
    return jsonError(
      ownerProfile.access_password_hash
        ? "Enter the owner password to unlock this private MindClone link before chatting."
        : "This private MindClone link is not available right now.",
      403,
    );
  }

  if (ownerProfile.require_visitor_name && !visitorName) {
    return jsonError("This owner requires visitors to share a name before chatting.", 400);
  }

  let activeConversationId = conversationId;
  let existingConversation = activeConversationId
    ? await getConversationRecord(activeConversationId)
    : null;

  if (activeConversationId && !existingConversation) {
    return jsonError("That conversation could not be found. Start a fresh chat instead.", 404);
  }

  if (!activeConversationId) {
    activeConversationId = await createPublicConversation({
      greeting: ownerProfile.greeting,
      visitorName,
    });
    existingConversation = await getConversationRecord(activeConversationId);
  } else if (visitorName) {
    await updateConversationVisitorName(activeConversationId, visitorName);
  }

  await insertConversationMessage({
    content: message,
    conversationId: activeConversationId,
    role: "user",
  });

  const [history, corrections, memoryChunks] = await Promise.all([
    getConversationMessages(activeConversationId),
    getStoredCorrections(),
    searchRelevantMemories(message, 5),
  ]);

  const stream = createGeminiTextStream({
    messages: history.map((historyMessage) => ({
      content: historyMessage.content,
      role: historyMessage.role,
    })),
    onComplete: async (fullText) => {
      const trimmed = fullText.trim();

      if (!trimmed) {
        return;
      }

      const assistantMessage = await insertConversationMessage({
        content: trimmed,
        conversationId: activeConversationId,
        role: "assistant",
      });

      try {
        await recordMessageMemoryCitations({
          assistantMessageId: assistantMessage.id,
          conversationId: activeConversationId,
          conversationScope: "public",
          memoryChunks,
        });
      } catch {
        // Analytics should never block the reply after the message itself is saved.
      }
    },
    system: buildPublicSystemPrompt({
      corrections,
      memoryChunks,
      ownerProfile,
      visitorName: visitorName ?? existingConversation?.visitor_name ?? null,
    }),
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-conversation-id": activeConversationId,
    },
  });
}
