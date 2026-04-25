"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import type { ConversationReview } from "@/lib/supabase/queries";
import type { Tables } from "@/lib/supabase/database.types";
import {
  createCorrection,
  deleteCorrection,
} from "@/app/dashboard/corrections/actions";

type CorrectionRecord = Tables<"corrections">;

type CorrectionsWorkspaceProps = {
  corrections: CorrectionRecord[];
  conversations: ConversationReview[];
};

type BannerState = {
  message: string;
  tone: "error" | "info" | "success";
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function getBannerClasses(tone: BannerState["tone"]) {
  if (tone === "error") {
    return "border-rose-400/18 bg-rose-400/10 text-rose-50";
  }

  if (tone === "success") {
    return "border-emerald-400/18 bg-emerald-400/10 text-emerald-50";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-50";
}

function buildRulePreview(input: {
  correctedResponse: string;
  originalResponse: string;
  topic: string;
}) {
  const originalResponse = input.originalResponse.trim();
  const correctedResponse = input.correctedResponse.trim();
  const topic = input.topic.trim();

  if (!originalResponse || !correctedResponse) {
    return null;
  }

  const topicLine = topic ? `When the topic is ${topic}: ` : "";

  return `${topicLine}Never say "${originalResponse}". Say something closer to "${correctedResponse}".`;
}

export function CorrectionsWorkspace({
  corrections: initialCorrections,
  conversations,
}: CorrectionsWorkspaceProps) {
  const toast = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversations[0]?.id ?? null,
  );
  const [corrections, setCorrections] = useState(initialCorrections);
  const [topic, setTopic] = useState("");
  const [originalResponse, setOriginalResponse] = useState("");
  const [correctedResponse, setCorrectedResponse] = useState("");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCorrectionId, setActiveCorrectionId] = useState<string | null>(null);

  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? null;

  const rulePreview = buildRulePreview({
    correctedResponse,
    originalResponse,
    topic,
  });

  async function handleSaveCorrection() {
    setBanner(null);
    setIsSaving(true);

    try {
      const result = await createCorrection({
        correctedResponse,
        originalResponse,
        topic,
      });

      if (result.status === "error") {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Correction not saved",
          tone: "error",
        });
        return;
      }

      const newCorrection: CorrectionRecord = {
        corrected_response: correctedResponse.trim(),
        created_at: new Date().toISOString(),
        id: result.correctionId ?? `temporary-${Date.now()}`,
        original_response: originalResponse.trim(),
        topic: topic.trim() || null,
      };

      setCorrections((currentCorrections) => [newCorrection, ...currentCorrections]);
      setCorrectedResponse("");
      setTopic("");
      setBanner({
        message: result.message,
        tone: "success",
      });
      toast({
        description: "The new rule will now reinforce future public and private replies.",
        title: "Correction saved",
        tone: "success",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCorrection(correctionId: string) {
    setBanner(null);
    setActiveCorrectionId(correctionId);

    try {
      const result = await deleteCorrection(correctionId);

      if (result.status === "error") {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Correction not deleted",
          tone: "error",
        });
        return;
      }

      setCorrections((currentCorrections) =>
        currentCorrections.filter((correction) => correction.id !== correctionId),
      );
      setBanner({
        message: result.message,
        tone: "success",
      });
      toast({
        description: "That reinforcement rule has been removed from the durable log.",
        title: "Correction deleted",
        tone: "success",
      });
    } finally {
      setActiveCorrectionId(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Transcript browser
            </CardDescription>
            <CardTitle className="text-white">Recent visitor conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 ? (
              <EmptyStateCard
                title="No visitor transcripts yet"
                description="Once visitors start chatting, their public conversations will show up here for review."
                hint="Step 6 storage is already live, so this list will populate automatically as real chats happen."
              />
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={cn(
                    "w-full rounded-[1.45rem] border p-4 text-left transition-colors",
                    selectedConversationId === conversation.id
                      ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]",
                  )}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setBanner(null);
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-inherit">
                      {conversation.visitorName?.trim() || "Anonymous visitor"}
                    </p>
                    <span className="text-xs text-inherit/70">
                      {formatDate(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-inherit/70">
                    <Badge className="bg-white/8 text-inherit">
                      {conversation.messageCount} messages
                    </Badge>
                    <Badge className="bg-white/8 text-inherit">
                      started {formatDate(conversation.startedAt)}
                    </Badge>
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
              Reinforcement log
            </CardDescription>
            <CardTitle className="text-white">Saved corrections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {corrections.length === 0 ? (
              <EmptyStateCard
                title="No corrections saved yet"
                description="The first correction you save here immediately becomes part of the clone's durable behavior rules."
                hint='Saved behavior will look like: "Never say X. Say something closer to Y."'
              />
            ) : (
              corrections.map((correction) => (
                <div
                  key={correction.id}
                  className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-emerald-400/12 text-emerald-100">
                        correction
                      </Badge>
                      {correction.topic?.trim() ? (
                        <Badge className="bg-white/8 text-slate-300">
                          {correction.topic.trim()}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(correction.created_at)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-rose-500/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">
                        Original response
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {correction.original_response}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">
                        Corrected response
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        {correction.corrected_response}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={activeCorrectionId === correction.id}
                      className="text-slate-300 hover:bg-white/8 hover:text-white"
                      onClick={() => void handleDeleteCorrection(correction.id)}
                    >
                      {activeCorrectionId === correction.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
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
              Transcript review
            </CardDescription>
            <CardTitle className="text-white">Flag and rewrite a reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {banner ? (
              <div
                className={cn(
                  "rounded-[1.4rem] border px-4 py-3 text-sm leading-6",
                  getBannerClasses(banner.tone),
                )}
              >
                {banner.message}
              </div>
            ) : null}

            {selectedConversation ? (
              <>
                <div className="rounded-[1.55rem] border border-white/10 bg-[#0d1824] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {selectedConversation.visitorName?.trim() || "Anonymous visitor"}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {selectedConversation.messageCount} saved messages
                      </p>
                    </div>
                    <Badge className="bg-white/8 text-slate-300">
                      {formatDate(selectedConversation.startedAt)}
                    </Badge>
                  </div>
                </div>

                <div className="soft-scrollbar max-h-[min(56vh,40rem)] space-y-4 overflow-y-auto rounded-[1.85rem] bg-[linear-gradient(180deg,#122031,#0d1824)] p-4 pr-3 sm:p-5 sm:pr-4">
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
                            {isAssistant ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full bg-black/5 px-3 text-xs text-slate-600 hover:bg-black/10 hover:text-slate-900"
                                onClick={() => {
                                  setOriginalResponse(message.content);
                                  setBanner({
                                    message: "Assistant reply loaded into the correction form.",
                                    tone: "info",
                                  });
                                  toast({
                                    description:
                                      "That assistant response is ready for you to rewrite below.",
                                    title: "Reply loaded",
                                    tone: "info",
                                  });
                                }}
                              >
                                Correct this reply
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[1.7rem] border border-white/10 bg-[#0b1622] p-4">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-white">
                      Save a durable correction
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Use this to teach the clone a better answer. New corrections
                      immediately feed into future public and private replies.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-200">
                        Topic (optional but helpful)
                      </label>
                      <Input
                        value={topic}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="How I handle disagreement, pricing, work style..."
                        className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-200">
                        Original response
                      </label>
                      <Textarea
                        value={originalResponse}
                        onChange={(event) => setOriginalResponse(event.target.value)}
                        placeholder="Pick an assistant message from the transcript or paste the original reply here."
                        className="min-h-[120px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-200">
                        What you would actually say instead
                      </label>
                      <Textarea
                        value={correctedResponse}
                        onChange={(event) => setCorrectedResponse(event.target.value)}
                        placeholder="Rewrite the answer exactly the way you would want MindClone to say it next time."
                        className="min-h-[140px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    {rulePreview ? (
                      <div className="rounded-[1.45rem] border border-emerald-300/10 bg-emerald-400/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                          Rule preview
                        </p>
                        <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                          {rulePreview}
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => void handleSaveCorrection()}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving correction..." : "Save correction"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyStateCard
                title="Choose a conversation"
                description="Select a recent visitor transcript to review how the clone answered and turn weak replies into permanent correction rules."
                hint="Only assistant replies can be flagged for correction."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
