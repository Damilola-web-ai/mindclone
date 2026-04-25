"use server";

import { revalidatePath } from "next/cache";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOwnerAccessState } from "@/lib/supabase/queries";

type OwnerNoteType = Enums<"owner_note_type">;

type OwnerNoteActionResult =
  | {
      message: string;
      note?: Tables<"owner_notes">;
      noteId?: string;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

function isOwnerNoteType(value: string): value is OwnerNoteType {
  return value === "note" || value === "task" || value === "reminder";
}

function trimNullableText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireOwnerAccess() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin access is required for private mode.");
  }

  const accessState = await getOwnerAccessState();

  if (!accessState.isOwner || !accessState.ownerProfile) {
    throw new Error("Only the owner account can use private mode.");
  }

  return accessState.ownerProfile;
}

function formatActionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong while updating private mode.";
}

export async function createOwnerNote(input: {
  content?: string;
  dueLabel?: string | null;
  title?: string;
  type?: string;
}): Promise<OwnerNoteActionResult> {
  try {
    await requireOwnerAccess();

    const rawType = input.type ?? "";

    if (!isOwnerNoteType(rawType)) {
      throw new Error("Choose whether this is a note, task, or reminder.");
    }

    const noteType: OwnerNoteType = rawType;
    const title = input.title?.trim() ?? "";
    const content = input.content?.trim() ?? "";

    if (!title && !content) {
      throw new Error("Add a title or some details before saving this item.");
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("owner_notes")
      .insert({
        content,
        due_label: trimNullableText(input.dueLabel),
        title,
        type: noteType,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("The note could not be saved to Supabase.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/private");

    return {
      message: "Private note saved.",
      note: data,
      status: "success",
    };
  } catch (error) {
    return {
      message: formatActionError(error),
      status: "error",
    };
  }
}

export async function toggleOwnerNoteCompletion(input: {
  isComplete: boolean;
  noteId: string;
}): Promise<OwnerNoteActionResult> {
  try {
    await requireOwnerAccess();

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("owner_notes")
      .update({
        is_complete: input.isComplete,
      })
      .eq("id", input.noteId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("The note status could not be updated.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/private");

    return {
      message: input.isComplete ? "Marked complete." : "Marked active again.",
      note: data,
      status: "success",
    };
  } catch (error) {
    return {
      message: formatActionError(error),
      status: "error",
    };
  }
}

export async function deleteOwnerNote(noteId: string): Promise<OwnerNoteActionResult> {
  try {
    await requireOwnerAccess();

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("owner_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      throw new Error("The note could not be deleted.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/private");

    return {
      message: "Private note deleted.",
      noteId,
      status: "success",
    };
  } catch (error) {
    return {
      message: formatActionError(error),
      status: "error",
    };
  }
}
