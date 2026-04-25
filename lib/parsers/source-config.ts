import type { Enums } from "@/lib/supabase/database.types";

export type MemorySourceType = Enums<"memory_source_type">;

type MemorySourceConfig = {
  type: MemorySourceType;
  label: string;
  formats: string;
  note: string;
  acceptedExtensions: string[];
};

export const memorySourceConfigs: MemorySourceConfig[] = [
  {
    type: "whatsapp",
    label: "WhatsApp export",
    formats: ".txt",
    note: "Captures real dialogue, shorthand, pacing, and casual phrasing.",
    acceptedExtensions: [".txt"],
  },
  {
    type: "journal",
    label: "Journal entry",
    formats: ".txt, .pdf",
    note: "Adds reflective language, inner voice, and emotional nuance.",
    acceptedExtensions: [".txt", ".pdf"],
  },
  {
    type: "voice_note",
    label: "Voice note",
    formats: ".mp3, .m4a, .wav, .webm",
    note: "Gets transcribed with Gemini before chunking.",
    acceptedExtensions: [".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mpeg", ".mpga"],
  },
  {
    type: "twitter_archive",
    label: "Twitter or X archive",
    formats: ".json",
    note: "Pulls recurring opinions, punchlines, and public phrasing patterns.",
    acceptedExtensions: [".json"],
  },
  {
    type: "writing",
    label: "General writing",
    formats: ".txt, .pdf, .docx",
    note: "Covers essays, notes, drafts, and any other writing that sounds like you.",
    acceptedExtensions: [".txt", ".pdf", ".docx"],
  },
];

export const memorySourceConfigMap = Object.fromEntries(
  memorySourceConfigs.map((config) => [config.type, config]),
) as Record<MemorySourceType, MemorySourceConfig>;

export const allAcceptedUploadExtensions = Array.from(
  new Set(
    memorySourceConfigs.flatMap((config) => config.acceptedExtensions),
  ),
).join(",");

export function isMemorySourceType(value: string): value is MemorySourceType {
  return memorySourceConfigs.some((config) => config.type === value);
}

export function getMemorySourceLabel(type: MemorySourceType) {
  return memorySourceConfigMap[type].label;
}

export function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex === -1) {
    return "";
  }

  return normalizedName.slice(extensionIndex);
}

export function validateSourceFile(
  sourceType: MemorySourceType,
  fileName: string,
) {
  const extension = getFileExtension(fileName);
  const sourceConfig = memorySourceConfigMap[sourceType];

  if (!sourceConfig.acceptedExtensions.includes(extension)) {
    throw new Error(
      `${sourceConfig.label} uploads must be one of: ${sourceConfig.formats}.`,
    );
  }
}
