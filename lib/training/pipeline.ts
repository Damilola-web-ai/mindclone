import { createMemoryEmbeddings } from "@/lib/embeddings/memory";
import { chunkMemoryText } from "@/lib/parsers/chunk-memory";
import { extractSourceText } from "@/lib/parsers/extract-text";
import type { MemorySourceType } from "@/lib/parsers/source-config";
import type { TableInsert } from "@/lib/supabase/database.types";

type BuildTrainingMemoryInput = {
  file: File;
  sourceId: string;
  sourceName: string;
  sourceType: MemorySourceType;
};

type BuildTrainingMemoryResult = {
  chunkCount: number;
  rows: TableInsert<"memory_chunks">[];
};

export async function buildTrainingMemory({
  file,
  sourceId,
  sourceName,
  sourceType,
}: BuildTrainingMemoryInput): Promise<BuildTrainingMemoryResult> {
  const extractedText = await extractSourceText(sourceType, file);
  const chunks = chunkMemoryText(extractedText);

  if (chunks.length === 0) {
    throw new Error("The upload was readable, but it was too small to train from.");
  }

  const embeddings = await createMemoryEmbeddings(
    chunks.map((chunk) => chunk.content),
  );

  const rows = chunks.map<TableInsert<"memory_chunks">>((chunk, index) => ({
    content: chunk.content,
    embedding: embeddings[index],
    source_name: sourceName,
    source_type: sourceType,
    uploaded_source_id: sourceId,
  }));

  return {
    chunkCount: rows.length,
    rows,
  };
}
