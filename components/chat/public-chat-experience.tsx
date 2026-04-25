"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildPublicSharePath } from "@/lib/profile/owner-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type PublicChatProfile = {
  bio: string;
  greeting: string;
  hasAccessPassword: boolean;
  isPublic: boolean;
  name: string;
  photoUrl: string | null;
  publicLinkSlug: string | null;
  requireVisitorName: boolean;
};

type ChatMessage = {
  content: string;
  id: string;
  role: "assistant" | "user";
};

type BannerState = {
  description: string;
  tone: "error" | "info";
};

type PublicChatExperienceProps = {
  initialChatAccess: boolean;
  ownerSlug?: string | null;
  profile: PublicChatProfile;
};

function buildInitialAssistantMessage(greeting: string) {
  const trimmedGreeting = greeting.trim();

  return trimmedGreeting.length > 0
    ? trimmedGreeting
    : "Thanks for stopping by. Ask me anything and I'll answer naturally.";
}

function getBannerClasses(tone: BannerState["tone"]) {
  return tone === "error"
    ? "border-rose-400/18 bg-rose-400/10 text-rose-50"
    : "border-amber-300/20 bg-amber-300/10 text-amber-50";
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "MC";
}

export function PublicChatExperience({
  initialChatAccess,
  ownerSlug,
  profile,
}: PublicChatExperienceProps) {
  const toast = useToast();
  const router = useRouter();
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);
  const [hasAccess, setHasAccess] = useState(initialChatAccess || profile.isPublic);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const greetingMessage = buildInitialAssistantMessage(profile.greeting);
  const sharePath = buildPublicSharePath(profile.publicLinkSlug);
  const requiresUnlock = !profile.isPublic && !hasAccess;
  const canStartChat = profile.isPublic || hasAccess;

  useEffect(() => {
    const transcriptElement = transcriptRef.current;

    if (!transcriptElement) {
      return;
    }

    transcriptElement.scrollTop = transcriptElement.scrollHeight;
  }, [messages]);

  function startChat() {
    setBanner(null);

    if (!canStartChat) {
      const nextBanner = {
        description: "Unlock this private link before you start the conversation.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Private chat is still locked",
        tone: "error",
      });
      return;
    }

    if (profile.requireVisitorName && !visitorName.trim()) {
      const nextBanner = {
        description: "This owner asks visitors to share a name before the conversation starts.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Add your name first",
        tone: "error",
      });
      return;
    }

    setStarted(true);
    setMessages([
      {
        content: greetingMessage,
        id: "greeting",
        role: "assistant",
      },
    ]);

    setTimeout(() => {
      composerRef.current?.focus();
    }, 0);

    toast({
      description: "The greeting is ready and replies will stream in live.",
      title: "Conversation started",
      tone: "info",
    });
  }

  async function unlockPrivateChat() {
    if (!profile.hasAccessPassword) {
      const nextBanner = {
        description: "This private link has not been configured yet.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Password not configured",
        tone: "error",
      });
      return;
    }

    if (!accessPassword.trim() || isUnlocking) {
      const nextBanner = {
        description: "Enter the owner password to unlock this private chat.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Password required",
        tone: "error",
      });
      return;
    }

    setBanner(null);
    setIsUnlocking(true);

    try {
      const response = await fetch("/api/public-access", {
        body: JSON.stringify({
          password: accessPassword,
          slug: ownerSlug ?? null,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "That private link could not be unlocked.");
      }

      setHasAccess(true);
      setAccessPassword("");
      const nextBanner = {
        description: "Private link unlocked. You can start chatting now.",
        tone: "info",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Private link unlocked",
        tone: "success",
      });
    } catch (error) {
      const nextBanner = {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while unlocking this private chat.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: "Unlock failed",
        tone: "error",
      });
    } finally {
      setIsUnlocking(false);
    }
  }

  async function sendMessage() {
    const trimmedDraft = draft.trim();

    if (!started) {
      startChat();
      return;
    }

    if (!trimmedDraft || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      content: trimmedDraft,
      id: `user-${Date.now()}`,
      role: "user",
    };
    const assistantMessageId = `assistant-${Date.now()}`;

    setBanner(null);
    setDraft("");
    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        content: "",
        id: assistantMessageId,
        role: "assistant",
      },
    ]);

    try {
      const response = await fetch("/api/public-chat", {
        body: JSON.stringify({
          conversationId,
          message: trimmedDraft,
          slug: ownerSlug ?? null,
          visitorName: visitorName.trim() || null,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "MindClone could not answer that message.");
      }

      const nextConversationId = response.headers.get("x-conversation-id");

      if (nextConversationId) {
        setConversationId(nextConversationId);
      }

      if (!response.body) {
        throw new Error("The chat stream did not start correctly.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantReply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!chunk) {
          continue;
        }

        fullAssistantReply += chunk;

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: fullAssistantReply }
              : message,
          ),
        );
      }

      if (!fullAssistantReply.trim()) {
        throw new Error("MindClone did not return any reply text.");
      }

      router.refresh();
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content:
                  error instanceof Error
                    ? `I hit a snag while replying: ${error.message}`
                    : "I hit a snag while replying.",
              }
            : message,
        ),
      );
      setBanner({
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending that message.",
        tone: "error",
      });
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending that message.",
        title: "Reply failed",
        tone: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="safe-pb mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="surface-border h-fit overflow-hidden shadow-[0_28px_80px_-56px_rgba(15,23,42,0.8)]">
          <CardHeader className="bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(244,235,225,0.92))]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-fit">
                {profile.isPublic ? "Public MindClone" : "Private MindClone"}
              </Badge>
              {!profile.isPublic ? (
                <Badge variant="outline" className="w-fit">
                  Password protected
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(19,107,105,0.94),rgba(222,128,61,0.94))] text-xl font-semibold text-white"
                style={
                  profile.photoUrl
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(19,107,105,0.3), rgba(222,128,61,0.24)), url(${profile.photoUrl})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }
                    : undefined
                }
                aria-label={profile.photoUrl ? `${profile.name} profile photo` : undefined}
                role={profile.photoUrl ? "img" : undefined}
              >
                {profile.photoUrl ? null : getInitials(profile.name)}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">{profile.name}</CardTitle>
                <CardDescription className="max-w-sm text-sm leading-6">
                  {profile.bio.trim()
                    ? profile.bio
                    : "This profile is live for public chat. The owner's uploaded memories and system prompt now shape each reply."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-[1.5rem] border border-border/70 bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                Greeting
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {greetingMessage}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Visitor names</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {profile.requireVisitorName
                    ? "This owner asks visitors to share a name before chatting."
                    : "Visitors can chat anonymously or optionally share a name."}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Share link</p>
                <p className="mt-2 font-mono text-sm text-brand">{sharePath}</p>
              </div>
            </div>

            {requiresUnlock ? (
              <div className="space-y-4 rounded-[1.7rem] border border-amber-300/20 bg-amber-300/8 p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">Unlock private chat</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This link is private. Enter the owner-set password before the conversation can begin.
                  </p>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Access password
                  </span>
                  <Input
                    type="password"
                    value={accessPassword}
                    onChange={(event) => setAccessPassword(event.target.value)}
                    placeholder="Enter password"
                  />
                </label>
                <Button
                  type="button"
                  onClick={() => void unlockPrivateChat()}
                  disabled={isUnlocking || !profile.hasAccessPassword}
                  className="w-full"
                >
                  {isUnlocking ? "Unlocking..." : "Unlock chat"}
                </Button>
              </div>
            ) : !started ? (
              <div className="space-y-4 rounded-[1.7rem] border border-border/70 bg-[#f7efe6]/90 p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Start chatting
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Once you start, replies stream in live and stay grounded in the
                    owner&apos;s stored memories and communication style.
                  </p>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {profile.requireVisitorName ? "Your name" : "Your name (optional)"}
                  </span>
                  <Input
                    value={visitorName}
                    onChange={(event) => setVisitorName(event.target.value)}
                    placeholder={
                      profile.requireVisitorName
                        ? "Tell them your name"
                        : "Stay anonymous if you want"
                    }
                  />
                </label>
                <Button type="button" onClick={startChat} className="w-full">
                  Start Chatting
                </Button>
              </div>
            ) : (
              <div className="rounded-[1.7rem] border border-emerald-400/15 bg-emerald-400/5 p-5">
                <p className="text-sm font-medium text-emerald-900">
                  Conversation is live
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-950/70">
                  Replies are streamed from Gemini and grounded with retrieved
                  memories from the owner&apos;s training data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-border overflow-hidden shadow-[0_28px_80px_-56px_rgba(15,23,42,0.8)]">
          <CardHeader className="border-b border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(249,242,236,0.92))]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardDescription>Conversation</CardDescription>
                <CardTitle className="mt-2 text-2xl">
                  Personal, light, and memory-grounded
                </CardTitle>
              </div>
              <Badge variant="outline">
                {requiresUnlock
                  ? "Locked"
                  : isSending
                    ? "Thinking..."
                    : started
                      ? "Live"
                      : "Waiting"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {banner ? (
              <div
                className={cn(
                  "rounded-[1.4rem] border px-4 py-3 text-sm leading-6",
                  getBannerClasses(banner.tone),
                )}
              >
                {banner.description}
              </div>
            ) : null}

            <div
              ref={transcriptRef}
              className="soft-scrollbar max-h-[min(55vh,38rem)] space-y-4 overflow-y-auto rounded-[1.9rem] bg-[linear-gradient(180deg,#f8f0e7,#efe4d5)] p-4 pr-3 sm:p-5 sm:pr-4"
              aria-live="polite"
            >
              {!started ? (
                <div className="rounded-[1.6rem] border border-white/60 bg-white/80 px-5 py-10 text-center shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
                  <p className="text-lg font-medium text-foreground">
                    Profile first, conversation second
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    The owner&apos;s public card lives on the left.{" "}
                    {requiresUnlock
                      ? 'Unlock the private link first, then hit "Start Chatting".'
                      : 'Hit "Start Chatting" to open the thread and send the first message.'}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "assistant" ? "flex justify-start" : "flex justify-end"}
                  >
                    <div
                      className={
                        message.role === "assistant"
                          ? "max-w-[88%] rounded-[1.6rem] rounded-bl-md bg-white px-4 py-3 text-sm leading-7 text-slate-700 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.5)]"
                          : "max-w-[88%] rounded-[1.6rem] rounded-br-md bg-brand px-4 py-3 text-sm leading-7 text-primary-foreground shadow-[0_18px_42px_-28px_rgba(12,74,110,0.68)]"
                      }
                    >
                      {message.content ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300" />
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="safe-pb rounded-[1.8rem] border border-border/70 bg-white/80 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                Message composer
              </p>
              <div className="space-y-3">
                <Textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={
                    requiresUnlock
                      ? "Unlock the private link first..."
                      : started
                        ? "Ask the owner anything..."
                        : "Start the chat first, then ask anything..."
                  }
                  className="min-h-[110px] resize-none border-border/80 bg-[#fffdf9]"
                  disabled={!started || isSending}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {profile.requireVisitorName
                      ? "Your name travels with the conversation."
                      : profile.isPublic
                        ? "Anonymous chats are allowed here."
                        : "This is a private link that stays locked until the owner password is entered."}
                  </p>
                  <Button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!started || isSending || !draft.trim()}
                    className="sm:min-w-[140px]"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
