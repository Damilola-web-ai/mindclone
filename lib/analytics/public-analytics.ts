import {
  createGeminiTextPart,
  extractGeminiText,
  GEMINI_CHAT_MODEL,
  postGeminiJson,
} from "@/lib/gemini/client";
import { hasGeminiEnv, hasSupabaseClientEnv } from "@/lib/env";
import { getPublicConversationReviews, type ConversationReview } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

type TopicSummaryMode = "ai" | "empty" | "heuristic";

type TopicDefinition = {
  defaultSummary: string;
  key: string;
  keywords: string[];
  title: string;
};

type TopicBucket = TopicDefinition & {
  messageCount: number;
  samplePrompt: string;
};

type TopicRewritePayload = {
  topics?: Array<{
    key?: string;
    summary?: string;
    title?: string;
  }>;
};

type TopicMessageRow = {
  content: string;
};

type SourceCitationRow = {
  conversation_id: string;
  created_at: string;
  source_name: string;
  source_type: Enums<"memory_source_type">;
  uploaded_source_id: string | null;
};

export type AnalyticsTopicInsight = {
  key: string;
  messageCount: number;
  samplePrompt: string;
  share: number;
  summary: string;
  title: string;
};

export type AnalyticsSourceUsage = {
  conversationCount: number;
  lastUsedAt: string;
  sourceId: string | null;
  sourceName: string;
  sourceType: Enums<"memory_source_type">;
  usageCount: number;
};

export type PublicAnalyticsSnapshot = {
  anonymousConversationCount: number;
  assistantMessageCount: number;
  recentConversations: ConversationReview[];
  topSource: AnalyticsSourceUsage | null;
  topicInsights: AnalyticsTopicInsight[];
  topicSummaryMode: TopicSummaryMode;
  totalMessages: number;
  totalPublicConversations: number;
  totalVisitors: number;
  uniqueNamedVisitors: number;
  userMessageCount: number;
  sourceUsage: AnalyticsSourceUsage[];
};

const TOPIC_LIMIT = 4;

const topicDefinitions: TopicDefinition[] = [
  {
    key: "decisions",
    title: "Advice and decisions",
    defaultSummary:
      "Visitors often ask for help choosing a path, weighing tradeoffs, or making sense of a situation.",
    keywords: [
      "advice",
      "choose",
      "decision",
      "decide",
      "help me",
      "should i",
      "what would you do",
      "which",
    ],
  },
  {
    key: "work",
    title: "Work and ambition",
    defaultSummary:
      "Career moves, client situations, productivity, and bigger work goals keep coming up.",
    keywords: [
      "business",
      "career",
      "client",
      "job",
      "launch",
      "productivity",
      "project",
      "startup",
      "work",
    ],
  },
  {
    key: "relationships",
    title: "Relationships and people",
    defaultSummary:
      "A lot of questions revolve around friendships, dating, family, and handling people well.",
    keywords: [
      "boyfriend",
      "dating",
      "family",
      "friend",
      "girlfriend",
      "husband",
      "partner",
      "relationship",
      "wife",
    ],
  },
  {
    key: "wellbeing",
    title: "Wellbeing and balance",
    defaultSummary:
      "Stress, boundaries, energy, confidence, and staying steady show up as recurring themes.",
    keywords: [
      "anxious",
      "balance",
      "boundary",
      "burnout",
      "confidence",
      "overwhelmed",
      "stress",
      "tired",
      "wellbeing",
    ],
  },
  {
    key: "creativity",
    title: "Creativity and projects",
    defaultSummary:
      "Visitors regularly ask about ideas, creative work, making things, and staying inspired.",
    keywords: [
      "build",
      "content",
      "create",
      "creative",
      "design",
      "idea",
      "music",
      "post",
      "write",
    ],
  },
  {
    key: "money",
    title: "Money and business",
    defaultSummary:
      "Pricing, income, spending, and business tradeoffs are turning into a recurring topic cluster.",
    keywords: [
      "budget",
      "income",
      "invest",
      "money",
      "pay",
      "price",
      "pricing",
      "revenue",
      "sales",
    ],
  },
  {
    key: "daily_life",
    title: "Daily life and routines",
    defaultSummary:
      "Some chats are about day-to-day habits, routines, logistics, and what life looks like right now.",
    keywords: [
      "day",
      "habit",
      "routine",
      "schedule",
      "today",
      "tomorrow",
      "week",
      "weekend",
    ],
  },
  {
    key: "travel",
    title: "Travel and plans",
    defaultSummary:
      "Trips, planning, where to go, and logistics around being somewhere else keep appearing.",
    keywords: [
      "airport",
      "flight",
      "hotel",
      "plan",
      "trip",
      "travel",
      "vacation",
      "visit",
    ],
  },
  {
    key: "general",
    title: "General catch-ups",
    defaultSummary:
      "These are broader conversations that feel like open-ended catch-ups, updates, or personal check-ins.",
    keywords: [],
  },
];

function createEmptySnapshot(): PublicAnalyticsSnapshot {
  return {
    anonymousConversationCount: 0,
    assistantMessageCount: 0,
    recentConversations: [],
    sourceUsage: [],
    topSource: null,
    topicInsights: [],
    topicSummaryMode: "empty",
    totalMessages: 0,
    totalPublicConversations: 0,
    totalVisitors: 0,
    uniqueNamedVisitors: 0,
    userMessageCount: 0,
  };
}

function normalizeVisitorName(visitorName?: string | null) {
  if (!visitorName) {
    return null;
  }

  const trimmed = visitorName.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function countVisitors(
  conversations: Array<{ id: string; visitor_name: string | null }>,
) {
  const namedVisitors = new Set<string>();
  let anonymousConversationCount = 0;

  conversations.forEach((conversation) => {
    const normalizedName = normalizeVisitorName(conversation.visitor_name);

    if (normalizedName) {
      namedVisitors.add(normalizedName);
      return;
    }

    anonymousConversationCount += 1;
  });

  return {
    anonymousConversationCount,
    totalVisitors: namedVisitors.size + anonymousConversationCount,
    uniqueNamedVisitors: namedVisitors.size,
  };
}

function scoreTopicMatch(message: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    if (message.includes(keyword)) {
      return score + 1;
    }

    return score;
  }, 0);
}

function classifyTopicMessage(message: string) {
  const normalizedMessage = message.trim().toLowerCase();
  let bestTopic = topicDefinitions[topicDefinitions.length - 1];
  let bestScore = 0;

  topicDefinitions.forEach((topicDefinition) => {
    if (topicDefinition.key === "general") {
      return;
    }

    const score = scoreTopicMatch(normalizedMessage, topicDefinition.keywords);

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topicDefinition;
    }
  });

  return bestTopic;
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

function buildHeuristicTopicInsights(
  userMessages: string[],
): AnalyticsTopicInsight[] {
  if (userMessages.length === 0) {
    return [];
  }

  const topicBuckets = topicDefinitions.reduce<Record<string, TopicBucket>>(
    (accumulator, topicDefinition) => {
      accumulator[topicDefinition.key] = {
        ...topicDefinition,
        messageCount: 0,
        samplePrompt: "",
      };

      return accumulator;
    },
    {},
  );

  userMessages.forEach((message) => {
    const matchedTopic = classifyTopicMessage(message);
    const bucket = topicBuckets[matchedTopic.key];

    bucket.messageCount += 1;

    if (!bucket.samplePrompt) {
      bucket.samplePrompt = truncateText(message, 180);
    }
  });

  return Object.values(topicBuckets)
    .filter((bucket) => bucket.messageCount > 0)
    .sort((left, right) => right.messageCount - left.messageCount)
    .slice(0, TOPIC_LIMIT)
    .map((bucket) => ({
      key: bucket.key,
      messageCount: bucket.messageCount,
      samplePrompt: bucket.samplePrompt,
      share: Math.max(1, Math.round((bucket.messageCount / userMessages.length) * 100)),
      summary: bucket.defaultSummary,
      title: bucket.title,
    }));
}

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return null;
  }

  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const startIndex = withoutFences.indexOf("{");
  const endIndex = withoutFences.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return withoutFences.slice(startIndex, endIndex + 1);
}

async function rewriteTopicInsightsWithGemini(
  topicInsights: AnalyticsTopicInsight[],
  userMessages: string[],
) {
  if (!hasGeminiEnv() || topicInsights.length === 0 || userMessages.length === 0) {
    return {
      mode: topicInsights.length === 0 ? "empty" : "heuristic",
      topicInsights,
    } satisfies {
      mode: TopicSummaryMode;
      topicInsights: AnalyticsTopicInsight[];
    };
  }

  try {
    const response = await postGeminiJson<Record<string, unknown>>(
      `models/${GEMINI_CHAT_MODEL}:generateContent`,
      {
        contents: [
          {
            parts: [
              createGeminiTextPart(
                [
                  "You are preparing an owner analytics dashboard for a personal AI clone.",
                  "Rewrite the candidate topics so they sound crisp and human, but keep the same topic keys.",
                  "Return JSON only in this exact shape:",
                  '{"topics":[{"key":"decisions","title":"Advice and decisions","summary":"Short owner-facing summary."}]}',
                  "",
                  "Candidate topics:",
                  JSON.stringify(
                    topicInsights.map((topicInsight) => ({
                      key: topicInsight.key,
                      messageCount: topicInsight.messageCount,
                      samplePrompt: topicInsight.samplePrompt,
                      summary: topicInsight.summary,
                      title: topicInsight.title,
                    })),
                    null,
                    2,
                  ),
                  "",
                  "Recent visitor messages:",
                  userMessages
                    .slice(0, 18)
                    .map((message, index) => `${index + 1}. ${truncateText(message, 220)}`)
                    .join("\n"),
                  "",
                  "Rules:",
                  "- Keep each title between 2 and 5 words.",
                  "- Keep each summary under 22 words.",
                  "- Do not invent new topic keys.",
                  "- Do not mention AI, embeddings, dashboards, or analytics in the summaries.",
                  "- JSON only.",
                ].join("\n"),
              ),
            ],
            role: "user",
          },
        ],
        system_instruction: {
          parts: [
            createGeminiTextPart(
              "You rewrite visitor-topic summaries for an owner dashboard. Always respond with valid JSON and nothing else.",
            ),
          ],
        },
      },
    );
    const textResponse = extractGeminiText(response).trim();

    if (!textResponse) {
      throw new Error("Gemini returned an empty topic summary.");
    }

    const jsonPayload = extractJsonPayload(textResponse);

    if (!jsonPayload) {
      throw new Error("Gemini did not return JSON for topic summaries.");
    }

    const parsedPayload = JSON.parse(jsonPayload) as TopicRewritePayload;
    const rewrittenTopics = new Map(
      (parsedPayload.topics ?? [])
        .filter((topic) => typeof topic.key === "string" && topic.key.trim().length > 0)
        .map((topic) => [
          topic.key!.trim(),
          {
            summary: typeof topic.summary === "string" ? topic.summary.trim() : "",
            title: typeof topic.title === "string" ? topic.title.trim() : "",
          },
        ]),
    );

    return {
      mode: "ai",
      topicInsights: topicInsights.map((topicInsight) => {
        const rewrittenTopic = rewrittenTopics.get(topicInsight.key);

        if (!rewrittenTopic) {
          return topicInsight;
        }

        return {
          ...topicInsight,
          summary: rewrittenTopic.summary || topicInsight.summary,
          title: rewrittenTopic.title || topicInsight.title,
        };
      }),
    } satisfies {
      mode: TopicSummaryMode;
      topicInsights: AnalyticsTopicInsight[];
    };
  } catch {
    return {
      mode: "heuristic",
      topicInsights,
    } satisfies {
      mode: TopicSummaryMode;
      topicInsights: AnalyticsTopicInsight[];
    };
  }
}

function buildSourceUsageInsights(sourceCitations: SourceCitationRow[]) {
  const groupedUsage = sourceCitations.reduce<
    Record<
      string,
      AnalyticsSourceUsage & {
        conversationIds: Set<string>;
      }
    >
  >(
    (accumulator, citation) => {
      const key =
        citation.uploaded_source_id ??
        `${citation.source_type}:${citation.source_name.toLowerCase()}`;
      const existingUsage = accumulator[key];

      if (!existingUsage) {
        accumulator[key] = {
          conversationCount: 1,
          conversationIds: new Set([citation.conversation_id]),
          lastUsedAt: citation.created_at,
          sourceId: citation.uploaded_source_id,
          sourceName: citation.source_name,
          sourceType: citation.source_type,
          usageCount: 1,
        };
        return accumulator;
      }

      existingUsage.usageCount += 1;

      if (citation.created_at > existingUsage.lastUsedAt) {
        existingUsage.lastUsedAt = citation.created_at;
      }

      if (!existingUsage.conversationIds.has(citation.conversation_id)) {
        existingUsage.conversationIds.add(citation.conversation_id);
        existingUsage.conversationCount += 1;
      }

      return accumulator;
    },
    {},
  );

  return Object.values(groupedUsage)
    .map((usage) => ({
      conversationCount: usage.conversationCount,
      lastUsedAt: usage.lastUsedAt,
      sourceId: usage.sourceId,
      sourceName: usage.sourceName,
      sourceType: usage.sourceType,
      usageCount: usage.usageCount,
    }))
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return right.lastUsedAt.localeCompare(left.lastUsedAt);
    });
}

export async function getPublicAnalyticsSnapshot(): Promise<PublicAnalyticsSnapshot> {
  if (!hasSupabaseClientEnv()) {
    return createEmptySnapshot();
  }

  const supabase = getSupabaseServerClient();
  const [publicConversationsResult, recentConversations] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, visitor_name")
      .eq("scope", "public")
      .order("started_at", { ascending: false }),
    getPublicConversationReviews(10),
  ]);

  const publicConversations = publicConversationsResult.data ?? [];

  if (publicConversationsResult.error || publicConversations.length === 0) {
    return {
      ...createEmptySnapshot(),
      recentConversations,
    };
  }

  const visitorCounts = countVisitors(publicConversations);

  const [
    userMessageCountResult,
    assistantMessageCountResult,
    topicMessagesResult,
    sourceCitationsResult,
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, conversations!inner(scope)", { count: "exact", head: true })
      .eq("conversations.scope", "public")
      .eq("role", "user"),
    supabase
      .from("messages")
      .select("id, conversations!inner(scope)", { count: "exact", head: true })
      .eq("conversations.scope", "public")
      .eq("role", "assistant"),
    supabase
      .from("messages")
      .select("content, conversations!inner(scope)")
      .eq("conversations.scope", "public")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("message_memory_citations")
      .select("conversation_id, created_at, source_name, source_type, uploaded_source_id")
      .eq("conversation_scope", "public")
      .order("created_at", { ascending: false }),
  ]);

  const userMessageCount = userMessageCountResult.count ?? 0;
  const assistantMessageCount = assistantMessageCountResult.count ?? 0;
  const heuristicTopicInsights = buildHeuristicTopicInsights(
    (topicMessagesResult.data as TopicMessageRow[] | null)?.map((message) => message.content) ??
      [],
  );
  const rewrittenTopicResult = await rewriteTopicInsightsWithGemini(
    heuristicTopicInsights,
    (topicMessagesResult.data as TopicMessageRow[] | null)?.map((message) => message.content) ??
      [],
  );
  const sourceUsage = buildSourceUsageInsights(
    (sourceCitationsResult.data as SourceCitationRow[] | null) ?? [],
  );

  return {
    anonymousConversationCount: visitorCounts.anonymousConversationCount,
    assistantMessageCount,
    recentConversations,
    sourceUsage,
    topSource: sourceUsage[0] ?? null,
    topicInsights: rewrittenTopicResult.topicInsights,
    topicSummaryMode: rewrittenTopicResult.mode,
    totalMessages: userMessageCount + assistantMessageCount,
    totalPublicConversations: publicConversations.length,
    totalVisitors: visitorCounts.totalVisitors,
    uniqueNamedVisitors: visitorCounts.uniqueNamedVisitors,
    userMessageCount,
  };
}
