"use server";

import { revalidatePath } from "next/cache";
import { hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";
import {
  isMemorySourceType,
  validateSourceFile,
} from "@/lib/parsers/source-config";
import { getOwnerAccessState } from "@/lib/supabase/queries";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildTrainingMemory } from "@/lib/training/pipeline";

type TrainingActionResult =
  | {
      status: "success";
      chunkCount?: number;
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

type TrainingUploadIntentResult =
  | {
      status: "success";
      sourceId: string;
      storagePath: string;
    }
  | {
      status: "error";
      message: string;
    };

function formatActionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong while training that memory source.";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

async function requireOwnerAccess() {
  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner) {
    throw new Error("Only the owner account can train MindClone.");
  }
}

async function markSourceAsFailed(sourceId: string) {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("memory_chunks")
    .delete()
    .eq("uploaded_source_id", sourceId);

  await supabase
    .from("uploaded_sources")
    .update({
      chunk_count: 0,
      status: "failed",
    })
    .eq("id", sourceId);
}

async function insertMemoryRows(rows: Awaited<ReturnType<typeof buildTrainingMemory>>["rows"]) {
  const supabase = getSupabaseAdminClient();
  const batchSize = 50;

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await supabase.from("memory_chunks").insert(batch);

    if (error) {
      throw new Error("The upload was parsed, but the memory vectors could not be saved.");
    }
  }
}

export async function createTrainingUploadIntent(input: {
  fileName: string;
  sourceType: string;
}): Promise<TrainingUploadIntentResult> {
  try {
    if (!hasSupabaseAdminEnv()) {
      throw new Error("Add your Supabase service-role key before training uploads.");
    }

    await requireOwnerAccess();

    if (!isMemorySourceType(input.sourceType)) {
      throw new Error("Choose a valid source type before uploading.");
    }

    if (!input.fileName.trim()) {
      throw new Error("Choose a file to upload before starting training.");
    }

    validateSourceFile(input.sourceType, input.fileName);

    const supabase = getSupabaseAdminClient();
    const { data: sourceRecord, error } = await supabase
      .from("uploaded_sources")
      .insert({
        file_name: input.fileName,
        source_type: input.sourceType,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !sourceRecord) {
      throw new Error("The source record could not be created in Supabase.");
    }

    const storagePath = `owner/${sourceRecord.id}/${sanitizeFileName(input.fileName)}`;
    const { error: updateError } = await supabase
      .from("uploaded_sources")
      .update({
        storage_path: storagePath,
      })
      .eq("id", sourceRecord.id);

    if (updateError) {
      throw new Error("The upload intent was created, but the storage path could not be saved.");
    }

    revalidatePath("/dashboard/train");

    return {
      status: "success",
      sourceId: sourceRecord.id,
      storagePath,
    };
  } catch (error) {
    return {
      status: "error",
      message: formatActionError(error),
    };
  }
}

export async function markTrainingSourceFailed(
  sourceId: string,
): Promise<TrainingActionResult> {
  try {
    if (!hasSupabaseAdminEnv()) {
      throw new Error("Supabase admin access is required to update training failures.");
    }

    await requireOwnerAccess();
    await markSourceAsFailed(sourceId);
    revalidatePath("/dashboard/train");

    return {
      status: "success",
      message: "The failed upload was marked as incomplete.",
    };
  } catch (error) {
    return {
      status: "error",
      message: formatActionError(error),
    };
  }
}

export async function processTrainingSource(
  sourceId: string,
): Promise<TrainingActionResult> {
  try {
    if (!hasSupabaseAdminEnv() || !hasGeminiEnv()) {
      throw new Error("Add Supabase admin and Gemini keys before processing memory sources.");
    }

    await requireOwnerAccess();

    const supabase = getSupabaseAdminClient();
    const { data: sourceRecord, error: lookupError } = await supabase
      .from("uploaded_sources")
      .select("file_name, source_type, storage_path")
      .eq("id", sourceId)
      .maybeSingle();

    if (lookupError || !sourceRecord || !sourceRecord.storage_path) {
      throw new Error("That upload could not be found in secure storage.");
    }

    const { error: processingError } = await supabase
      .from("uploaded_sources")
      .update({
        status: "processing",
      })
      .eq("id", sourceId);

    if (processingError) {
      throw new Error("The upload record could not be moved into processing.");
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("training-uploads")
      .download(sourceRecord.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error("The uploaded file could not be downloaded from Supabase storage.");
    }

    const file = new File([fileBlob], sourceRecord.file_name, {
      type: fileBlob.type || "application/octet-stream",
    });
    const trainingResult = await buildTrainingMemory({
      file,
      sourceId,
      sourceName: sourceRecord.file_name,
      sourceType: sourceRecord.source_type,
    });

    await insertMemoryRows(trainingResult.rows);

    const { error: completeError } = await supabase
      .from("uploaded_sources")
      .update({
        chunk_count: trainingResult.chunkCount,
        status: "completed",
      })
      .eq("id", sourceId);

    if (completeError) {
      throw new Error("The memory chunks saved, but the source summary could not be updated.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/train");

    return {
      status: "success",
      chunkCount: trainingResult.chunkCount,
      message: `${sourceRecord.file_name} was trained successfully.`,
    };
  } catch (error) {
    if (sourceId) {
      await markSourceAsFailed(sourceId);
    }

    return {
      status: "error",
      message: formatActionError(error),
    };
  }
}

export async function deleteTrainingSource(
  sourceId: string,
): Promise<TrainingActionResult> {
  try {
    if (!hasSupabaseAdminEnv()) {
      throw new Error("Supabase admin access is required to delete memory sources.");
    }

    await requireOwnerAccess();

    const supabase = getSupabaseAdminClient();
    const { data: sourceRecord, error: sourceLookupError } = await supabase
      .from("uploaded_sources")
      .select("file_name, storage_path")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceLookupError || !sourceRecord) {
      throw new Error("That upload no longer exists.");
    }

    if (sourceRecord.storage_path) {
      await supabase.storage
        .from("training-uploads")
        .remove([sourceRecord.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from("uploaded_sources")
      .delete()
      .eq("id", sourceId);

    if (deleteError) {
      throw new Error("The upload could not be deleted from Supabase.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/train");

    return {
      status: "success",
      message: `${sourceRecord.file_name} was removed from the memory bank.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: formatActionError(error),
    };
  }
}
