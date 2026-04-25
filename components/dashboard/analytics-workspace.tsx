"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { getMemorySourceLabel } from "@/lib/parsers/source-config";
import type {
  AnalyticsSourceUsage,
  AnalyticsTopicInsight,
} from "@/lib/analytics/public-analytics";
import type { ConversationReview } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

type AnalyticsWorkspaceProps = {
  recentConversations: ConversationReview[];
  sourceUsage: AnalyticsSourceUsage[];
  topicInsights: AnalyticsTopicInsight[];
  topicSummaryMode: "ai" | "empty" | "heuristic";
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function getTopicSummaryLabel(mode: AnalyticsWorkspaceProps["topicSummaryMode"]) {
  if (mode === "ai") {
    return "AI-polished from recent visitor prompts";
  }

  if (mode === "heuristic") {
    return "Summarized from recent visitor prompts";
  }

  return "Waiting for enough visitor chat data";
}

export function AnalyticsWorkspace({
  recentConversations,
  sourceUsage,
  topicInsights,
  topicSummaryMode,
}: AnalyticsWorkspaceProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    recentConversations[0]?.id ?? null,
  );

  const selectedConversation =
    recentConversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? null;
  const strongestSourceUsage = sourceUsage[0]?.usageCount ?? 1;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              {getTopicSummaryLabel(topicSummaryMode)}
            </CardDescription>
            <CardTitle className="text-white">Most common visitor topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topicInsights.length === 0 ? (
              <EmptyStateCard
                title="No topic trends yet"
                description="Once visitors have a few real conversations with MindClone, this panel will summarize the themes they ask about most."
                hint="The summary is built from stored public visitor prompts, so it improves automatically as more chats come in."
              />
            ) : (
              topicInsights.map((topic) => (
                <div
                  key={topic.key}
                  className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-medium text-white">{topic.title}</p>
                      <p className="text-sm leading-6 text-slate-400">{topic.summary}</p>
                    </div>
                    <Badge className="bg-emerald-400/12 text-emerald-100">
                      {topic.share}% share
                    </Badge>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300"
                      style={{ width: `${Math.min(topic.share, 100)}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{topic.messageCount} visitor prompts</span>
                    <span>
                      Sample: &quot;{topic.samplePrompt}&quot;
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Based on retrieved memory chunks used in public replies
            </CardDescription>
            <CardTitle className="text-white">Most used memory sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceUsage.length === 0 ? (
              <EmptyStateCard
                title="No grounded-source data yet"
                description="Source usage appears after visitors receive replies that pull from stored memory chunks."
                hint="As soon as public responses start grounding themselves in uploaded memories, this ranking fills in automatically."
              />
            ) : (
              sourceUsage.slice(0, 6).map((source) => (
                <div
                  key={
                    source.sourceId ??
                    `${source.sourceType}:${source.sourceName.toLowerCase()}`
                  }
                  className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-white">
                        {source.sourceName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className="bg-white/8 text-slate-300">
                          {getMemorySourceLabel(source.sourceType)}
                        </Badge>
                        <Badge className="bg-cyan-400/12 text-cyan-100">
                          {source.usageCount} retrievals
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      last used {formatDate(source.lastUsedAt)}
                    </p>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400"
                      style={{
                        width: `${Math.max(
                          10,
                          Math.round((source.usageCount / strongestSourceUsage) * 100),
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Used across {source.conversationCount} public conversation
                    {source.conversationCount === 1 ? "" : "s"} so far.
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Stored visitor transcripts
            </CardDescription>
            <CardTitle className="text-white">Recent conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentConversations.length === 0 ? (
              <EmptyStateCard
                title="No visitor conversations yet"
                description="Public chat transcripts will appear here as soon as people start talking to the clone."
                hint="Step 6 storage is already in place, so this list will populate automatically."
              />
            ) : (
              recentConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={cn(
                    "w-full rounded-[1.45rem] border p-4 text-left transition-colors",
                    selectedConversationId === conversation.id
                      ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]",
                  )}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-inherit">
                      {conversation.visitorName?.trim() || "Anonymous visitor"}
                    </p>
                    <span className="text-xs text-inherit/70">
                      {formatDate(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-white/8 text-inherit">
                      {conversation.messageCount} messages
                    </Badge>
                    <Badge className="bg-white/8 text-inherit">Read transcript</Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-inherit/80">
                    {conversation.preview}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Full transcript reader
            </CardDescription>
            <CardTitle className="text-white">Selected conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedConversation ? (
              <>
                <div className="rounded-[1.55rem] border border-white/10 bg-[#0d1824] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {selectedConversation.visitorName?.trim() || "Anonymous visitor"}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Started {formatDate(selectedConversation.startedAt)}
                      </p>
                    </div>
                    <Badge className="bg-cyan-400/12 text-cyan-100">
                      {selectedConversation.messageCount} saved messages
                    </Badge>
                  </div>
                </div>

                <div className="soft-scrollbar max-h-[min(56vh,40rem)] space-y-4 overflow-y-auto rounded-[1.85rem] bg-[linear-gradient(180deg,#132232,#0d1825)] p-4 pr-3 sm:p-5 sm:pr-4">
                  {selectedConversation.transcript.map((message) => {
                    const isAssistant = message.role === "assistant";

                    return (
                      <div
                        key={message.id}
                        className={isAssistant ? "flex justify-start" : "flex justify-end"}
                      >
                        <div
                          className={
                            isAssistant
                              ? "max-w-[88%] rounded-[1.6rem] rounded-bl-md bg-white/95 px-4 py-3 text-sm leading-7 text-slate-700 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]"
                              : "max-w-[88%] rounded-[1.6rem] rounded-br-md bg-cyan-400 px-4 py-3 text-sm leading-7 text-slate-950 shadow-[0_18px_42px_-30px_rgba(34,211,238,0.55)]"
                          }
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.24em] text-inherit/60">
                              {isAssistant ? "assistant" : "visitor"}
                            </span>
                            <span className="text-xs text-inherit/60">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyStateCard
                title="Choose a conversation"
                description="Pick a recent visitor transcript to inspect the full back-and-forth, message by message."
                hint="This view is useful for spotting patterns before you add a correction in the corrections workspace."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
