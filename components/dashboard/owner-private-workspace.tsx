"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import {
  createOwnerNote,
  deleteOwnerNote,
  toggleOwnerNoteCompletion,
} from "@/app/dashboard/private/actions";

type OwnerNote = Tables<"owner_notes">;
type OwnerMessage = Pick<Tables<"messages">, "content" | "role">;

type WorkspaceBanner = {
  message: string;
  tone: "error" | "info" | "success";
};

type OwnerPrivateWorkspaceProps = {
  initialConversationId: string | null;
  initialMessages: OwnerMessage[];
  initialNotes: OwnerNote[];
  ownerName: string;
};

type NoteType = OwnerNote["type"];

function getBannerClasses(tone: WorkspaceBanner["tone"]) {
  if (tone === "error") {
    return "border-rose-400/18 bg-rose-400/10 text-rose-50";
  }

  if (tone === "success") {
    return "border-emerald-400/18 bg-emerald-400/10 text-emerald-50";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-50";
}

function buildIntroMessage(ownerName: string) {
  return `Private mode is on. I can help you think through decisions, summarize what you have going on, and use your notes, reminders, and long-term memory as context, ${ownerName}.`;
}

function getTypeCopy(type: NoteType) {
  if (type === "task") {
    return {
      dueLabel: "When is it due? (optional)",
      emptyTitle: "No active tasks yet",
      emptyDescription: "Add work you need to finish, decisions you need to make, or anything you want private mode to help you prioritize.",
      label: "Tasks",
      placeholder: "Ship the onboarding rewrite",
    };
  }

  if (type === "reminder") {
    return {
      dueLabel: "When should I remember it? (optional)",
      emptyTitle: "No reminders yet",
      emptyDescription: "Drop time-sensitive items here so private mode can answer questions like \"what do I have going on?\" with current context.",
      label: "Reminders",
      placeholder: "Call Jamie before Friday",
    };
  }

  return {
    dueLabel: "Timing or context (optional)",
    emptyTitle: "No notes yet",
    emptyDescription: "Capture loose thoughts, personal context, or anything you want the private assistant to keep in mind.",
    label: "Notes",
    placeholder: "Things I want to keep in mind this week",
  };
}

function getNoteTypeBadge(type: NoteType) {
  if (type === "task") {
    return "bg-cyan-400/12 text-cyan-100";
  }

  if (type === "reminder") {
    return "bg-amber-300/12 text-amber-100";
  }

  return "bg-violet-300/12 text-violet-100";
}

export function OwnerPrivateWorkspace({
  initialConversationId,
  initialMessages,
  initialNotes,
  ownerName,
}: OwnerPrivateWorkspaceProps) {
  const toast = useToast();
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<Array<{ content: string; id: string; role: "assistant" | "user" }>>(
    initialMessages.length > 0
      ? initialMessages.map((message, index) => ({
          content: message.content,
          id: `history-${index}`,
          role: message.role,
        }))
      : [
          {
            content: buildIntroMessage(ownerName),
            id: "owner-intro",
            role: "assistant",
          },
        ],
  );
  const [notes, setNotes] = useState(initialNotes);
  const [banner, setBanner] = useState<WorkspaceBanner | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>("task");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDueLabel, setNoteDueLabel] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    const transcriptElement = transcriptRef.current;

    if (!transcriptElement) {
      return;
    }

    transcriptElement.scrollTop = transcriptElement.scrollHeight;
  }, [messages]);

  const activeTasks = notes.filter(
    (note) => note.type === "task" && !note.is_complete,
  );
  const activeReminders = notes.filter(
    (note) => note.type === "reminder" && !note.is_complete,
  );
  const personalNotes = notes.filter((note) => note.type === "note");
  const currentTypeCopy = getTypeCopy(noteType);

  function startFreshThread() {
    setConversationId(null);
    setDraft("");
    setBanner(null);
    setMessages([
      {
        content: buildIntroMessage(ownerName),
        id: `owner-intro-${Date.now()}`,
        role: "assistant",
      },
    ]);
    setTimeout(() => {
      composerRef.current?.focus();
    }, 0);
    toast({
      description:
        "Older messages stay saved in Supabase, but this workspace now has a clean thread.",
      title: "Fresh thread started",
      tone: "info",
    });
  }

  async function handleCreateNote() {
    setBanner(null);
    setIsSavingNote(true);

    try {
      const result = await createOwnerNote({
        content: noteContent,
        dueLabel: noteDueLabel,
        title: noteTitle,
        type: noteType,
      });

      if (result.status === "error" || !result.note) {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Note not saved",
          tone: "error",
        });
        return;
      }

      setNotes((currentNotes) => [result.note!, ...currentNotes]);
      setNoteTitle("");
      setNoteContent("");
      setNoteDueLabel("");
      setBanner(null);
      toast({
        description: "Private mode can now use this context in future replies.",
        title: `${currentTypeCopy.label.slice(0, -1)} saved`,
        tone: "success",
      });
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleToggleNote(note: OwnerNote) {
    setBanner(null);
    setActiveNoteId(note.id);

    try {
      const result = await toggleOwnerNoteCompletion({
        isComplete: !note.is_complete,
        noteId: note.id,
      });

      if (result.status === "error" || !result.note) {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Update failed",
          tone: "error",
        });
        return;
      }

      setNotes((currentNotes) =>
        currentNotes.map((currentNote) =>
          currentNote.id === result.note!.id ? result.note! : currentNote,
        ),
      );
      setBanner(null);
      toast({
        description: "Your private context board has been updated.",
        title: note.is_complete ? "Note reactivated" : "Note completed",
        tone: "success",
      });
    } finally {
      setActiveNoteId(null);
    }
  }

  async function handleDeleteNote(noteId: string) {
    setBanner(null);
    setActiveNoteId(noteId);

    try {
      const result = await deleteOwnerNote(noteId);

      if (result.status === "error") {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Delete failed",
          tone: "error",
        });
        return;
      }

      setNotes((currentNotes) =>
        currentNotes.filter((currentNote) => currentNote.id !== noteId),
      );
      setBanner(null);
      toast({
        description: "The item has been removed from your private context board.",
        title: "Note deleted",
        tone: "success",
      });
    } finally {
      setActiveNoteId(null);
    }
  }

  async function sendMessage() {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isSending) {
      return;
    }

    const userMessage = {
      content: trimmedDraft,
      id: `user-${Date.now()}`,
      role: "user" as const,
    };
    const assistantId = `assistant-${Date.now()}`;

    setBanner(null);
    setDraft("");
    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        content: "",
        id: assistantId,
        role: "assistant",
      },
    ]);

    try {
      const response = await fetch("/api/owner-chat", {
        body: JSON.stringify({
          conversationId,
          message: trimmedDraft,
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

        throw new Error(
          payload?.error ?? "Private mode could not answer that message.",
        );
      }

      const nextConversationId = response.headers.get("x-conversation-id");

      if (nextConversationId) {
        setConversationId(nextConversationId);
      }

      if (!response.body) {
        throw new Error("The private chat stream did not start correctly.");
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
            message.id === assistantId
              ? { ...message, content: fullAssistantReply }
              : message,
          ),
        );
      }

      if (!fullAssistantReply.trim()) {
        throw new Error("Private mode did not return any reply text.");
      }
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantId
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
        message:
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
        title: "Private reply failed",
        tone: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  function renderNoteSection(sectionType: NoteType, sectionNotes: OwnerNote[]) {
    const copy = getTypeCopy(sectionType);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">{copy.label}</p>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
            {sectionNotes.length}
          </span>
        </div>

        {sectionNotes.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm leading-6 text-slate-400">
            <p className="font-medium text-slate-200">{copy.emptyTitle}</p>
            <p className="mt-2">{copy.emptyDescription}</p>
          </div>
        ) : (
          sectionNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "rounded-[1.45rem] border p-4",
                note.is_complete
                  ? "border-white/5 bg-white/[0.02] opacity-75"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getNoteTypeBadge(note.type)}>{note.type}</Badge>
                {note.is_complete ? (
                  <Badge className="bg-emerald-400/12 text-emerald-100">
                    complete
                  </Badge>
                ) : null}
                {note.due_label?.trim() ? (
                  <Badge className="bg-white/8 text-slate-300">
                    {note.due_label.trim()}
                  </Badge>
                ) : null}
              </div>

              {note.title.trim() ? (
                <p className="mt-3 text-base font-medium text-white">
                  {note.title}
                </p>
              ) : null}

              {note.content.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {note.content}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={activeNoteId === note.id}
                  className="bg-white/10 text-white hover:bg-white/15"
                  onClick={() => void handleToggleNote(note)}
                >
                  {activeNoteId === note.id
                    ? "Saving..."
                    : note.is_complete
                      ? "Mark active"
                      : "Mark done"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={activeNoteId === note.id}
                  className="text-slate-300 hover:bg-white/8 hover:text-white"
                  onClick={() => void handleDeleteNote(note.id)}
                >
                  {activeNoteId === note.id ? "Working..." : "Delete"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardDescription className="text-slate-400">
                  Private assistant
                </CardDescription>
                <CardTitle className="mt-2 text-white">
                  Owner-only chat workspace
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-400/12 text-emerald-100">
                  Private mode
                </Badge>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 text-white hover:bg-white/15"
                  onClick={startFreshThread}
                >
                  Start fresh
                </Button>
              </div>
            </div>
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

            <div
              ref={transcriptRef}
              className="soft-scrollbar max-h-[min(55vh,38rem)] overflow-y-auto rounded-[1.85rem] bg-[linear-gradient(180deg,#132232,#0d1825)] p-4 pr-3 sm:p-5 sm:pr-4"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                <span>Current private thread</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                  {conversationId ? "saved" : "unsaved"}
                </span>
              </div>

              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "assistant" ? "flex justify-start" : "flex justify-end"}
                  >
                    <div
                      className={
                        message.role === "assistant"
                          ? "max-w-[88%] rounded-[1.6rem] rounded-bl-md bg-white/95 px-4 py-3 text-sm leading-7 text-slate-700 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]"
                          : "max-w-[88%] rounded-[1.6rem] rounded-br-md bg-emerald-400 px-4 py-3 text-sm leading-7 text-slate-950 shadow-[0_18px_42px_-30px_rgba(16,185,129,0.55)]"
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
                ))}
              </div>
            </div>

            <div className="safe-pb rounded-[1.7rem] border border-white/10 bg-[#0b1622] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/70">
                  Ask private mode
                </p>
                <p className="text-sm text-slate-400">
                  Notes and reminders are included automatically.
                </p>
              </div>
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
                  placeholder="What do I have going on? Help me prioritize this week. Help me decide between these options..."
                  className="min-h-[120px] resize-none border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                  disabled={isSending}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-400">
                    This route is owner-only and never shown to visitors.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={isSending || !draft.trim()}
                    className="sm:min-w-[140px]"
                  >
                    {isSending ? "Thinking..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Private context
            </CardDescription>
            <CardTitle className="text-white">
              Notes, tasks, and reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["task", "Tasks"],
                ["reminder", "Reminders"],
                ["note", "Notes"],
              ] as Array<[NoteType, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded-[1.35rem] border px-4 py-3 text-left transition-colors",
                    noteType === value
                      ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white",
                  )}
                  onClick={() => setNoteType(value)}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-inherit/80">
                    Add a {value} for private mode.
                  </p>
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="text-slate-200">Title</Label>
                <Input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder={currentTypeCopy.placeholder}
                  className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-200">{currentTypeCopy.dueLabel}</Label>
                <Input
                  value={noteDueLabel}
                  onChange={(event) => setNoteDueLabel(event.target.value)}
                  placeholder="Tomorrow morning, this week, before launch..."
                  className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-200">Details</Label>
                <Textarea
                  value={noteContent}
                  onChange={(event) => setNoteContent(event.target.value)}
                  placeholder="Add more context, constraints, or the exact thing you want to remember."
                  className="min-h-[110px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleCreateNote()}
                disabled={isSavingNote}
              >
                {isSavingNote ? "Saving..." : `Add ${noteType}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardTitle className="text-white">Active context board</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderNoteSection("task", activeTasks)}
            {renderNoteSection("reminder", activeReminders)}
            {renderNoteSection("note", personalNotes)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
