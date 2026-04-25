"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TrainingProgressCard } from "@/components/dashboard/training-progress-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import {
  createTrainingUploadIntent,
  deleteTrainingSource,
  markTrainingSourceFailed,
  processTrainingSource,
} from "@/app/dashboard/train/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getMemorySourceLabel,
  memorySourceConfigMap,
  memorySourceConfigs,
  type MemorySourceType,
} from "@/lib/parsers/source-config";
import type { Tables } from "@/lib/supabase/database.types";

type TrainingWorkspaceProps = {
  hasTrainingEnv: boolean;
  uploadedSources: Tables<"uploaded_sources">[];
};

type BannerState = {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
};

function getBannerClasses(tone: BannerState["tone"]) {
  if (tone === "success") {
    return "border-emerald-400/20 bg-emerald-400/8 text-emerald-50";
  }

  if (tone === "warning") {
    return "border-amber-300/20 bg-amber-300/8 text-amber-50";
  }

  return "border-rose-400/20 bg-rose-400/8 text-rose-50";
}

function getUploadStatusBadgeStyles(status: string) {
  if (status === "completed") {
    return "bg-emerald-400/12 text-emerald-200";
  }

  if (status === "processing") {
    return "bg-amber-300/12 text-amber-100";
  }

  if (status === "failed") {
    return "bg-rose-400/12 text-rose-200";
  }

  return "bg-white/8 text-slate-300";
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export function TrainingWorkspace({
  hasTrainingEnv,
  uploadedSources,
}: TrainingWorkspaceProps) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedSourceType, setSelectedSourceType] =
    useState<MemorySourceType>("whatsapp");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [activeStage, setActiveStage] = useState<"uploading" | "processing" | null>(
    null,
  );
  const [isDeletingSourceId, setIsDeletingSourceId] = useState<string | null>(null);

  const totalChunks = uploadedSources.reduce(
    (sum, source) => sum + source.chunk_count,
    0,
  );
  const completedSources = uploadedSources.filter(
    (source) => source.status === "completed",
  ).length;
  const currentSourceConfig = memorySourceConfigMap[selectedSourceType];

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    if (!hasTrainingEnv) {
      const nextBanner = {
        tone: "error",
        title: "Training is disabled",
        description:
          "Add `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` to `.env.local` before uploading files.",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: nextBanner.title,
        tone: "error",
      });
      return;
    }

    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      const nextBanner = {
        tone: "error",
        title: "No file selected",
        description: "Choose a file before starting the training pipeline.",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: nextBanner.title,
        tone: "error",
      });
      return;
    }

    try {
      setActiveStage("uploading");

      const intentResult = await createTrainingUploadIntent({
        fileName: file.name,
        sourceType: selectedSourceType,
      });

      if (intentResult.status === "error") {
        const nextBanner = {
          tone: "error",
          title: "Upload blocked",
          description: intentResult.message,
        } satisfies BannerState;

        setBanner(nextBanner);
        toast({
          description: nextBanner.description,
          title: nextBanner.title,
          tone: "error",
        });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("training-uploads")
        .upload(intentResult.storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        await markTrainingSourceFailed(intentResult.sourceId);
        const nextBanner = {
          tone: "error",
          title: "Storage upload failed",
          description:
            uploadError.message ||
            "The file could not be uploaded into the private storage bucket.",
        } satisfies BannerState;

        setBanner(nextBanner);
        toast({
          description: nextBanner.description,
          title: nextBanner.title,
          tone: "error",
        });
        router.refresh();
        return;
      }

      setActiveStage("processing");

      const trainingResult = await processTrainingSource(intentResult.sourceId);

      if (trainingResult.status === "error") {
        const nextBanner = {
          tone: "error",
          title: "Training failed",
          description: trainingResult.message,
        } satisfies BannerState;

        setBanner(nextBanner);
        toast({
          description: nextBanner.description,
          title: nextBanner.title,
          tone: "error",
        });
        router.refresh();
        return;
      }

      formRef.current?.reset();
      setSelectedSourceType("whatsapp");
      const nextBanner = {
        tone: "success",
        title: "Training complete",
        description: `${file.name} is now part of the memory bank with ${
          trainingResult.chunkCount ?? 0
        } saved retrieval chunk${trainingResult.chunkCount === 1 ? "" : "s"}.`,
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: nextBanner.title,
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const nextBanner = {
        tone: "error",
        title: "Training failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while uploading this source.",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: nextBanner.title,
        tone: "error",
      });
    } finally {
      setActiveStage(null);
    }
  }

  async function handleDelete(sourceId: string) {
    setBanner(null);
    setIsDeletingSourceId(sourceId);

    try {
      const deletionResult = await deleteTrainingSource(sourceId);

      if (deletionResult.status === "error") {
        const nextBanner = {
          tone: "error",
          title: "Delete failed",
          description: deletionResult.message,
        } satisfies BannerState;

        setBanner(nextBanner);
        toast({
          description: nextBanner.description,
          title: nextBanner.title,
          tone: "error",
        });
        return;
      }

      const nextBanner = {
        tone: "warning",
        title: "Source deleted",
        description: deletionResult.message,
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.description,
        title: nextBanner.title,
        tone: "warning",
      });
      router.refresh();
    } finally {
      setIsDeletingSourceId(null);
    }
  }

  return (
    <div className="space-y-8">
      {!hasTrainingEnv ? (
        <Card className="border-amber-300/20 bg-amber-300/8 text-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-amber-100">
              Add `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` to `.env.local`
              before training uploads. Files now upload directly to Supabase storage so
              the flow stays within Vercel&apos;s function payload limits.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {banner ? (
        <Card className={`shadow-none ${getBannerClasses(banner.tone)}`}>
          <CardContent className="p-5">
            <p className="text-sm font-medium">{banner.title}</p>
            <p className="mt-2 text-sm leading-6 text-current/90">
              {banner.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">Stored sources</CardDescription>
            <CardTitle className="text-white">{uploadedSources.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">Completed trainings</CardDescription>
            <CardTitle className="text-white">{completedSources}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">Memory chunks</CardDescription>
            <CardTitle className="text-white">{totalChunks}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Train the memory bank
            </CardDescription>
            <CardTitle className="text-white">Upload a new source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form ref={formRef} onSubmit={handleUpload} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Source type
                  </span>
                  <select
                    value={selectedSourceType}
                    onChange={(event) =>
                      setSelectedSourceType(event.target.value as MemorySourceType)
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#07101a] px-4 text-sm text-white outline-none transition-colors focus:border-emerald-300/60"
                    disabled={!hasTrainingEnv || Boolean(activeStage)}
                  >
                    {memorySourceConfigs.map((source) => (
                      <option key={source.type} value={source.type}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Source file
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={currentSourceConfig.acceptedExtensions.join(",")}
                    disabled={!hasTrainingEnv || Boolean(activeStage)}
                    className="block h-12 w-full rounded-2xl border border-dashed border-white/15 bg-[#07101a] px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-400/12 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-100 hover:file:bg-emerald-400/18"
                  />
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-[#07101a] p-4">
                <p className="text-sm font-medium text-white">What happens next</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    "Files upload straight to the private Supabase storage bucket instead of traveling through a Vercel function body.",
                    "Voice notes are transcribed with Gemini before memory chunking begins.",
                    "Chunks are stored at roughly 300 to 500 token-sized retrieval slices.",
                    "Embeddings are generated with gemini-embedding-001 and written to pgvector.",
                  ].map((step) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!hasTrainingEnv || Boolean(activeStage)}
                className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                {activeStage === "uploading"
                  ? "Uploading source..."
                  : activeStage === "processing"
                    ? "Training source..."
                    : "Train this source"}
              </Button>

              <TrainingProgressCard stage={activeStage} />
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
            <CardHeader>
              <CardTitle className="text-white">Accepted source types</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {memorySourceConfigs.map((source) => (
                <div
                  key={source.type}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-white">{source.label}</p>
                    <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-slate-400">
                      {source.formats}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{source.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
            <CardHeader>
              <CardTitle className="text-white">Storage notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-400">
              <p>
                Uploads land in the private `training-uploads` bucket and each
                source gets a matching `uploaded_sources` record.
              </p>
              <p>
                Failed jobs stay visible in the dashboard so you can inspect or
                delete them without losing track of what happened.
              </p>
              <p>
                Voice note transcription currently uses Gemini file uploads plus a
                transcript prompt, so the full training pipeline now stays on one
                provider.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
        <CardHeader>
          <CardDescription className="text-slate-400">
            Upload dashboard
          </CardDescription>
          <CardTitle className="text-white">Stored training sources</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedSources.length === 0 ? (
            <EmptyStateCard
              title="No uploads yet"
              description="Upload your first memory source to start building the retrieval layer behind MindClone."
              hint="Upload your first memory -> WhatsApp exports, journal files, voice notes, and archives all work here."
            />
          ) : (
            <div className="soft-scrollbar max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {uploadedSources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-[1.5rem] border border-white/10 bg-[#07101a] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-medium text-white">
                          {source.file_name}
                        </p>
                        <Badge
                          className={getUploadStatusBadgeStyles(source.status)}
                        >
                          {source.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                        <span>{getMemorySourceLabel(source.source_type)}</span>
                        <span>{source.chunk_count} chunks</span>
                        <span>{formatCreatedAt(source.created_at)}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        Boolean(activeStage) || isDeletingSourceId === source.id
                      }
                      onClick={() => handleDelete(source.id)}
                      className="bg-white/10 text-white hover:bg-white/15"
                    >
                      {isDeletingSourceId === source.id
                        ? "Deleting..."
                        : "Delete source"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
