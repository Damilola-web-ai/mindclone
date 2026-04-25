import type { NextRequest } from "next/server";
import { createGeminiTextStream } from "@/lib/chat/gemini-stream";
import {
  createConversation,
  getConversationMessages,
  getConversationRecordByScope,
  getOwnerNotes,
  getStoredCorrections,
  insertConversationMessage,
  recordMessageMemoryCitations,
  searchRelevantMemories,
} from "@/lib/chat/public-chat";
import { buildOwnerPrivateSystemPrompt } from "@/lib/chat/owner-private-prompt";
import { hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";
import { getOwnerAccessState } from "@/lib/supabase/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const maxDuration = 90;

type OwnerChatRequestBody = {
  conversationId?: string;
  message?: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminEnv() || !hasGeminiEnv()) {
    return jsonError(
      "Private mode needs Supabase admin access and a Gemini API key before it can answer.",
      503,
    );
  }

  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile) {
    return jsonError("Only the signed-in owner can use private mode.", 403);
  }

  let body: OwnerChatRequestBody;

  try {
    body = (await request.json()) as OwnerChatRequestBody;
  } catch {
    return jsonError("The private chat request body could not be read.", 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";

  if (!message) {
    return jsonError("Write a message before sending.", 400);
  }

  if (message.length > 4000) {
    return jsonError("Keep messages under 4,000 characters for now.", 400);
  }

  let activeConversationId = conversationId;
  const existingConversation = activeConversationId
    ? await getConversationRecordByScope(activeConversationId, "owner_private")
    : null;

  if (activeConversationId && !existingConversation) {
    return jsonError("That private thread could not be found. Start a fresh one instead.", 404);
  }

  if (!activeConversationId) {
    activeConversationId = await createConversation({
      scope: "owner_private",
    });
  }

  await insertConversationMessage({
    content: message,
    conversationId: activeConversationId,
    role: "user",
  });

  const [history, corrections, memoryChunks, ownerNotes] = await Promise.all([
    getConversationMessages(activeConversationId),
    getStoredCorrections(),
    searchRelevantMemories(message, 5),
    getOwnerNotes(),
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
          conversationScope: "owner_private",
          memoryChunks,
        });
      } catch {
        // Analytics should never block the reply after the message itself is saved.
      }
    },
    system: buildOwnerPrivateSystemPrompt({
      corrections,
      memoryChunks,
      notes: ownerNotes,
      ownerProfile: accessState.ownerProfile,
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
