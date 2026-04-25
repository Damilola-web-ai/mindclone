import type { User } from "@supabase/supabase-js";
import { hasSupabaseAdminEnv, hasSupabaseClientEnv } from "@/lib/env";
import {
  createEmptyQuizAnswers,
  mapQuestionToId,
  mergeQuizAnswers,
  type QuizAnswers,
} from "@/lib/personality-quiz";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ConversationReview = {
  id: string;
  lastMessageAt: string;
  messageCount: number;
  preview: string;
  startedAt: string;
  transcript: Tables<"messages">[];
  visitorName: string | null;
};

export async function getCurrentUser(): Promise<User | null> {
  if (!hasSupabaseClientEnv()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

export async function getCurrentOwnerProfile() {
  if (!hasSupabaseClientEnv()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_profile")
    .select("*")
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export async function hasOwnerProfile() {
  if (!hasSupabaseAdminEnv()) {
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("owner_profile")
    .select("id", { count: "exact", head: true });

  if (error) {
    return false;
  }

  return Boolean(count && count > 0);
}

export async function getOwnerQuizAnswers(): Promise<QuizAnswers> {
  if (!hasSupabaseClientEnv()) {
    return createEmptyQuizAnswers();
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("personality_quiz")
    .select("question, answer");

  if (error || !data) {
    return createEmptyQuizAnswers();
  }

  const mappedAnswers: Partial<QuizAnswers> = data.reduce<Partial<QuizAnswers>>(
    (accumulator, row) => {
    const questionId = mapQuestionToId(row.question);

    if (questionId) {
      accumulator[questionId] = row.answer ?? "";
    }

    return accumulator;
    },
    {},
  );

  return mergeQuizAnswers(mappedAnswers);
}

export async function getPublicOwnerProfile(slug?: string | null) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_public_owner_profile", {
    profile_slug: slug ?? null,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

export async function getUploadedSources() {
  if (!hasSupabaseClientEnv()) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("uploaded_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOwnerNotes() {
  if (!hasSupabaseClientEnv()) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_notes")
    .select("*")
    .order("is_complete", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getLatestConversationByScope(
  scope: Enums<"conversation_scope">,
) {
  if (!hasSupabaseClientEnv()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("scope", scope)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getConversationMessagesById(conversationId: string) {
  if (!hasSupabaseClientEnv()) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getPublicConversationReviews(limit = 12) {
  if (!hasSupabaseClientEnv()) {
    return [] as ConversationReview[];
  }

  const supabase = getSupabaseServerClient();
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("*")
    .eq("scope", "public")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (conversationsError || !conversations || conversations.length === 0) {
    return [] as ConversationReview[];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError || !messages) {
    return conversations.map((conversation) => ({
      id: conversation.id,
      lastMessageAt: conversation.started_at,
      messageCount: 0,
      preview: "No messages saved yet.",
      startedAt: conversation.started_at,
      transcript: [],
      visitorName: conversation.visitor_name,
    }));
  }

  const messagesByConversation = messages.reduce<Record<string, Tables<"messages">[]>>(
    (accumulator, message) => {
      if (!accumulator[message.conversation_id]) {
        accumulator[message.conversation_id] = [];
      }

      accumulator[message.conversation_id].push(message);
      return accumulator;
    },
    {},
  );

  return conversations.map((conversation) => {
    const transcript = messagesByConversation[conversation.id] ?? [];
    const lastMessage = transcript[transcript.length - 1];
    const preview = lastMessage?.content.trim()
      ? lastMessage.content.trim().slice(0, 180)
      : "Conversation started but no transcript preview is available yet.";

    return {
      id: conversation.id,
      lastMessageAt: lastMessage?.created_at ?? conversation.started_at,
      messageCount: transcript.length,
      preview,
      startedAt: conversation.started_at,
      transcript,
      visitorName: conversation.visitor_name,
    };
  });
}

export async function getCorrectionsLog(limit = 50) {
  if (!hasSupabaseClientEnv()) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("corrections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOwnerAccessState(): Promise<{
  isOwner: boolean;
  ownerProfile: Tables<"owner_profile"> | null;
  user: User | null;
}> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      isOwner: false,
      ownerProfile: null,
      user: null,
    };
  }

  const ownerProfile = await getCurrentOwnerProfile();

  return {
    isOwner: Boolean(ownerProfile),
    ownerProfile,
    user,
  };
}
