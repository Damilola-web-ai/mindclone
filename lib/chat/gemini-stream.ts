import {
  createGeminiTextPart,
  extractGeminiText,
  getPreferredGeminiChatModels,
  postGeminiJson,
  type GeminiContent,
} from "@/lib/gemini/client";

type GeminiMessage = {
  content: string;
  role: "assistant" | "user";
};

type CreateGeminiTextStreamInput = {
  messages: GeminiMessage[];
  onComplete?: (fullText: string) => Promise<void> | void;
  system: string;
};

function toGeminiContents(messages: GeminiMessage[]): GeminiContent[] {
  return messages.map((message) => ({
    parts: [createGeminiTextPart(message.content)],
    role: message.role === "assistant" ? "model" : "user",
  }));
}

function splitIntoStreamingChunks(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [];
  }

  const words = normalizedText.split(/(\s+)/).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    if ((currentChunk + word).length > 28 && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = word;
      continue;
    }

    currentChunk += word;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function shouldTryFallbackModel(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("resource has been exhausted") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("try again later")
  );
}

async function generateGeminiReply(
  messages: GeminiMessage[],
  system: string,
) {
  const candidateModels = getPreferredGeminiChatModels();
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const response = await postGeminiJson<Record<string, unknown>>(
        `models/${model}:generateContent`,
        {
          contents: toGeminiContents(messages),
          generationConfig: {
            maxOutputTokens: 1024,
          },
          systemInstruction: {
            parts: [createGeminiTextPart(system)],
          },
        },
      );

      return extractGeminiText(response);
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Gemini could not generate a reply.");

      if (!shouldTryFallbackModel(lastError.message)) {
        break;
      }

      await sleep(300);
    }
  }

  throw lastError ?? new Error("Gemini could not generate a reply.");
}

export function createGeminiTextStream({
  messages,
  onComplete,
  system,
}: CreateGeminiTextStreamInput) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";

      try {
        fullText = await generateGeminiReply(messages, system);

        for (const chunk of splitIntoStreamingChunks(fullText)) {
          controller.enqueue(encoder.encode(chunk));
          await sleep(14);
        }

        if (onComplete) {
          await onComplete(fullText);
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The Gemini stream failed unexpectedly.";

        controller.enqueue(
          encoder.encode(`I'm having trouble reaching Gemini right now. ${message}`),
        );
        controller.close();
      }
    },
  });
}
