"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOwnerAccessState } from "@/lib/supabase/queries";

type CorrectionActionResult =
  | {
      correctionId?: string;
      message: string;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

async function requireOwnerAccess() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin access is required for corrections.");
  }

  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner) {
    throw new Error("Only the owner account can manage corrections.");
  }
}

function formatActionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong while updating the correction log.";
}

function trimRequiredText(value?: string) {
  return value?.trim() ?? "";
}

export async function createCorrection(input: {
  correctedResponse?: string;
  originalResponse?: string;
  topic?: string;
}): Promise<CorrectionActionResult> {
  try {
    await requireOwnerAccess();

    const originalResponse = trimRequiredText(input.originalResponse);
    const correctedResponse = trimRequiredText(input.correctedResponse);
    const topic = input.topic?.trim() ?? "";

    if (!originalResponse) {
      throw new Error("Choose an original assistant reply before saving a correction.");
    }

    if (!correctedResponse) {
      throw new Error("Add the corrected wording you would actually use.");
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("corrections")
      .insert({
        corrected_response: correctedResponse,
        original_response: originalResponse,
        topic: topic || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("The correction could not be saved to Supabase.");
    }

    revalidatePath("/dashboard/corrections");

    return {
      correctionId: data.id,
      message: "Correction saved and will now influence future replies.",
      status: "success",
    };
  } catch (error) {
    return {
      message: formatActionError(error),
      status: "error",
    };
  }
}

export async function deleteCorrection(
  correctionId: string,
): Promise<CorrectionActionResult> {
  try {
    await requireOwnerAccess();

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("corrections")
      .delete()
      .eq("id", correctionId);

    if (error) {
      throw new Error("The correction could not be deleted.");
    }

    revalidatePath("/dashboard/corrections");

    return {
      correctionId,
      message: "Correction removed from the reinforcement log.",
      status: "success",
    };
  } catch (error) {
    return {
      message: formatActionError(error),
      status: "error",
    };
  }
}
