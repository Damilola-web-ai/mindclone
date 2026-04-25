import { PageHeader } from "@/components/dashboard/page-header";
import { TrainingWorkspace } from "@/components/dashboard/training-workspace";
import { hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";
import { getUploadedSources } from "@/lib/supabase/queries";

export const runtime = "nodejs";
export const preferredRegion = "home";
export const maxDuration = 300;

export default async function TrainPage() {
  const uploadedSources = await getUploadedSources();
  const hasTrainingEnv = hasSupabaseAdminEnv() && hasGeminiEnv();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Training"
        title="Upload, parse, and store real memory"
        description="Owner uploads now flow through secure Supabase storage, document parsing, voice transcription, chunking, embeddings, and pgvector-backed memory storage. This is the source ingestion pipeline that powers retrieval later."
      />
      <TrainingWorkspace
        hasTrainingEnv={hasTrainingEnv}
        uploadedSources={uploadedSources}
      />
    </div>
  );
}
