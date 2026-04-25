import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
  createGeminiFilePart,
  createGeminiTextPart,
  extractGeminiText,
  GEMINI_CHAT_MODEL,
  postGeminiJson,
  uploadGeminiFile,
} from "@/lib/gemini/client";
import {
  getFileExtension,
  type MemorySourceType,
} from "@/lib/parsers/source-config";

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function uniqueNonEmptyStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => normalizeExtractedText(value)).filter(Boolean)),
  );
}

async function loadPdfText(file: File) {
  const loader = new PDFLoader(file, {
    splitPages: false,
    parsedItemSeparator: " ",
  });
  const docs = await loader.load();

  return docs.map((doc) => doc.pageContent).join("\n\n");
}

async function loadDocxText(file: File) {
  const loader = new DocxLoader(file);
  const docs = await loader.load();

  return docs.map((doc) => doc.pageContent).join("\n\n");
}

function collectArchiveText(value: unknown, collector: string[]) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (normalizedValue.length >= 24) {
      collector.push(normalizedValue);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectArchiveText(entry, collector));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.full_text === "string") {
    collector.push(record.full_text);
  }

  if (typeof record.text === "string") {
    collector.push(record.text);
  }

  if (typeof record.content === "string") {
    collector.push(record.content);
  }

  if (
    record.messageCreate &&
    typeof record.messageCreate === "object" &&
    typeof (record.messageCreate as Record<string, unknown>).text === "string"
  ) {
    collector.push((record.messageCreate as Record<string, string>).text);
  }

  Object.values(record).forEach((entry) => collectArchiveText(entry, collector));
}

async function parseTwitterArchive(file: File) {
  const rawJson = await file.text();
  const parsedArchive = JSON.parse(rawJson) as unknown;
  const collectedText: string[] = [];

  collectArchiveText(parsedArchive, collectedText);

  return uniqueNonEmptyStrings(collectedText).join("\n\n");
}

async function transcribeVoiceNote(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "audio/mpeg";

  const uploadedFile = await uploadGeminiFile({
    bytes,
    displayName: file.name,
    mimeType,
  });
  const transcription = await postGeminiJson<Record<string, unknown>>(
    `models/${GEMINI_CHAT_MODEL}:generateContent`,
    {
      contents: [
        {
          parts: [
            createGeminiTextPart(
              "Transcribe this audio as plain text. Return only the transcript.",
            ),
            createGeminiFilePart(uploadedFile.uri, uploadedFile.mimeType),
          ],
          role: "user",
        },
      ],
    },
  );

  return extractGeminiText(transcription);
}

async function parseDocumentFile(file: File) {
  const extension = getFileExtension(file.name);

  if (extension === ".pdf") {
    return loadPdfText(file);
  }

  if (extension === ".docx") {
    return loadDocxText(file);
  }

  return file.text();
}

export async function extractSourceText(sourceType: MemorySourceType, file: File) {
  let rawText = "";

  if (sourceType === "voice_note") {
    rawText = await transcribeVoiceNote(file);
  } else if (sourceType === "twitter_archive") {
    rawText = await parseTwitterArchive(file);
  } else {
    rawText = await parseDocumentFile(file);
  }

  const cleanedText = normalizeExtractedText(rawText);

  if (!cleanedText) {
    throw new Error("This upload did not produce any readable text.");
  }

  return cleanedText;
}
