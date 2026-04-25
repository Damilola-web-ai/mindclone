import { createSingleEmbedding } from "@/lib/embeddings/memory";
import { hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";
import type {
  Enums,
  TableInsert,
  Tables,
} from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ConversationScope = Enums<"conversation_scope">;
export type OwnerNoteType = Enums<"owner_note_type">;
export type OwnerNote = Tables<"owner_notes">;

export type PublicChatOwnerProfile = Pick<
  Tables<"owner_profile">,
  | "id"
  | "access_password_hash"
  | "name"
  | "bio"
  | "greeting"
  | "is_public"
  | "photo_url"
  | "public_link_slug"
  | "require_visitor_name"
  | "system_prompt"
>;

export type StoredConversationMessage = Pick<
  Tables<"messages">,
  "content" | "created_at" | "role"
>;

export type RetrievedMemoryChunk = {
  content: string;
  created_at: string;
  id: string;
  similarity: number;
  source_name: string;
  source_type: Enums<"memory_source_type">;
  uploaded_source_id: string | null;
};

function trimNullableText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getPublicChatOwnerProfile(slug?: string | null) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("owner_profile")
    .select(
      "id, access_password_hash, name, bio, greeting, is_public, photo_url, public_link_slug, require_visitor_name, system_prompt",
    )
    .limit(1);

  const normalizedSlug = trimNullableText(slug);

  if (normalizedSlug) {
    query = query.eq("public_link_slug", normalizedSlug);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PublicChatOwnerProfile;
}

export async function getConversationRecord(conversationId: string) {
  return getConversationRecordByScope(conversationId, "public");
}

export async function getConversationRecordByScope(
  conversationId: string,
  scope: ConversationScope,
) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, visitor_name, scope")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data || data.scope !== scope) {
    return null;
  }

  return data;
}

export async function createPublicConversation(input: {
  greeting?: string | null;
  visitorName?: string | null;
}) {
  return createConversation({
    openingAssistantMessage: input.greeting,
    scope: "public",
    visitorName: input.visitorName,
  });
}

export async function createConversation(input: {
  openingAssistantMessage?: string | null;
  scope: ConversationScope;
  visitorName?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      scope: input.scope,
      visitor_name: trimNullableText(input.visitorName),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("The conversation could not be created.");
  }

  const greeting = trimNullableText(input.openingAssistantMessage);

  if (greeting) {
    await insertConversationMessage({
      content: greeting,
      conversationId: data.id,
      role: "assistant",
    });
  }

  return data.id;
}

export async function updateConversationVisitorName(
  conversationId: string,
  visitorName?: string | null,
) {
  const normalizedVisitorName = trimNullableText(visitorName);

  if (!normalizedVisitorName) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  await supabase
    .from("conversations")
    .update({
      visitor_name: normalizedVisitorName,
    })
    .eq("id", conversationId);
}

export async function insertConversationMessage(input: {
  content: string;
  conversationId: string;
  role: Tables<"messages">["role"];
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      content: input.content,
      conversation_id: input.conversationId,
      role: input.role,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("A conversation message could not be saved.");
  }

  return data as Tables<"messages">;
}

export async function recordMessageMemoryCitations(input: {
  assistantMessageId: string;
  conversationId: string;
  conversationScope: Enums<"conversation_scope">;
  memoryChunks: RetrievedMemoryChunk[];
}) {
  if (input.memoryChunks.length === 0) {
    return;
  }

  const uniqueCitationRows = Array.from(
    new Map(
      input.memoryChunks.map((chunk) => [
        chunk.id,
        {
          assistant_message_id: input.assistantMessageId,
          conversation_id: input.conversationId,
          conversation_scope: input.conversationScope,
          memory_chunk_id: chunk.id,
          similarity: chunk.similarity,
          source_name: chunk.source_name,
          source_type: chunk.source_type,
          uploaded_source_id: chunk.uploaded_source_id,
        } satisfies TableInsert<"message_memory_citations">,
      ]),
    ).values(),
  );

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("message_memory_citations")
    .insert(uniqueCitationRows);

  if (error) {
    throw new Error("The memory usage analytics event could not be saved.");
  }
}

export async function getConversationMessages(conversationId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as StoredConversationMessage[];
}

export async function getStoredCorrections() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("corrections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOwnerNotes() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("owner_notes")
    .select("*")
    .order("is_complete", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as OwnerNote[];
}

export async function searchRelevantMemories(
  message: string,
  matchCount = 5,
): Promise<RetrievedMemoryChunk[]> {
  if (!hasSupabaseAdminEnv() || !hasGeminiEnv()) {
    return [];
  }

  const queryEmbedding = await createSingleEmbedding(message);

  if (queryEmbedding.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("match_memory_chunks", {
    match_count: matchCount,
    query_embedding: queryEmbedding,
  });

  if (error || !data) {
    return [];
  }

  return data as RetrievedMemoryChunk[];
}
