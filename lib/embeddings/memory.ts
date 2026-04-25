import {
  createGeminiTextPart,
  GEMINI_EMBEDDING_DIMENSIONS,
  GEMINI_EMBEDDING_MODEL,
  postGeminiJson,
} from "@/lib/gemini/client";

const EMBEDDING_BATCH_SIZE = 16;

function serializeEmbedding(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

export async function createMemoryEmbeddings(inputs: string[]) {
  const serializedEmbeddings: string[] = [];

  for (let index = 0; index < inputs.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(index, index + EMBEDDING_BATCH_SIZE);

    if (batch.length === 0) {
      continue;
    }

    const batchEmbeddings = await Promise.all(
      batch.map(async (input) => {
        const response = await postGeminiJson<{
          embedding?: { values?: number[] };
        }>(`models/${GEMINI_EMBEDDING_MODEL}:embedContent`, {
          content: {
            parts: [createGeminiTextPart(input)],
            role: "user",
          },
          outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        });

        return response.embedding?.values ?? [];
      }),
    );

    batchEmbeddings.forEach((embedding) => {
      serializedEmbeddings.push(serializeEmbedding(embedding));
    });
  }

  return serializedEmbeddings;
}

export async function createSingleEmbedding(input: string) {
  const response = await postGeminiJson<{
    embedding?: { values?: number[] };
  }>(`models/${GEMINI_EMBEDDING_MODEL}:embedContent`, {
    content: {
      parts: [createGeminiTextPart(input)],
      role: "user",
    },
    outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_QUERY",
  });

  return response.embedding?.values ?? [];
}
