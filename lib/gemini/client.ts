import { requireEnv } from "@/lib/env";

export const GEMINI_DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite";
export const GEMINI_CHAT_MODEL = GEMINI_DEFAULT_CHAT_MODEL;
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
export const GEMINI_EMBEDDING_DIMENSIONS = 1536;

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD_BASE_URL =
  "https://generativelanguage.googleapis.com/upload/v1beta";

export type GeminiPart =
  | { text: string }
  | {
      file_data: {
        file_uri: string;
        mime_type: string;
      };
    }
  | {
      inline_data: {
        data: string;
        mime_type: string;
      };
    };

export type GeminiContent = {
  parts: GeminiPart[];
  role?: "model" | "user";
};

type GeminiErrorPayload = {
  error?: {
    message?: string;
  };
};

type GeminiGenerateContentPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiUploadResponse = {
  file?: {
    mimeType?: string;
    uri?: string;
  };
};

function getGeminiApiKey() {
  return requireEnv("GEMINI_API_KEY");
}

function readOptionalChatModelOverride() {
  const value = process.env.GEMINI_CHAT_MODEL?.trim();
  return value ? value : null;
}

function getGeminiHeaders(additionalHeaders?: HeadersInit) {
  return {
    "x-goog-api-key": getGeminiApiKey(),
    ...additionalHeaders,
  };
}

function parseGeminiErrorMessage(payload: string) {
  try {
    const parsed = JSON.parse(payload) as GeminiErrorPayload;
    return parsed.error?.message ?? "Gemini returned an error.";
  } catch {
    return "Gemini returned an unreadable error response.";
  }
}

export function extractGeminiText(payload: unknown) {
  const parsed = payload as GeminiGenerateContentPayload;

  return (
    parsed.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

export function createGeminiTextPart(text: string): GeminiPart {
  return { text };
}

export function createGeminiFilePart(fileUri: string, mimeType: string): GeminiPart {
  return {
    file_data: {
      file_uri: fileUri,
      mime_type: mimeType,
    },
  };
}

export function createGeminiInlineDataPart(
  data: string,
  mimeType: string,
): GeminiPart {
  return {
    inline_data: {
      data,
      mime_type: mimeType,
    },
  };
}

export function getPreferredGeminiChatModels() {
  return Array.from(
    new Set(
      [
        readOptionalChatModelOverride(),
        GEMINI_DEFAULT_CHAT_MODEL,
        "gemini-2.5-flash",
      ].filter((model): model is string => Boolean(model)),
    ),
  );
}

export async function postGeminiJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${GEMINI_API_BASE_URL}/${path}`, {
    method: "POST",
    headers: getGeminiHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(parseGeminiErrorMessage(await response.text()));
  }

  return (await response.json()) as TResponse;
}

export async function openGeminiStream(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${GEMINI_API_BASE_URL}/${path}`, {
    method: "POST",
    headers: getGeminiHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(parseGeminiErrorMessage(await response.text()));
  }

  if (!response.body) {
    throw new Error("Gemini did not return a readable stream.");
  }

  return response;
}

export async function uploadGeminiFile(input: {
  bytes: Uint8Array;
  displayName: string;
  mimeType: string;
}) {
  const startResponse = await fetch(`${GEMINI_UPLOAD_BASE_URL}/files`, {
    method: "POST",
    headers: getGeminiHeaders({
      "content-type": "application/json",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(input.bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": input.mimeType,
      "X-Goog-Upload-Protocol": "resumable",
    }),
    body: JSON.stringify({
      file: {
        display_name: input.displayName,
      },
    }),
    cache: "no-store",
  });

  if (!startResponse.ok) {
    throw new Error(parseGeminiErrorMessage(await startResponse.text()));
  }

  const uploadUrl = startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error("Gemini did not return an upload URL for this file.");
  }

  const finalizeResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(input.bytes.byteLength),
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
    body: Buffer.from(input.bytes),
    cache: "no-store",
  });

  if (!finalizeResponse.ok) {
    throw new Error(parseGeminiErrorMessage(await finalizeResponse.text()));
  }

  const payload = (await finalizeResponse.json()) as GeminiUploadResponse;
  const fileUri = payload.file?.uri;

  if (!fileUri) {
    throw new Error("Gemini uploaded the file but did not return a file URI.");
  }

  return {
    mimeType: payload.file?.mimeType ?? input.mimeType,
    uri: fileUri,
  };
}
