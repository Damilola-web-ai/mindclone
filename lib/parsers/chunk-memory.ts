type ChunkMemoryOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

export type MemoryTextChunk = {
  content: string;
  estimatedTokens: number;
  sequence: number;
};

const DEFAULT_MAX_CHARACTERS = 1800;
const DEFAULT_OVERLAP_CHARACTERS = 240;

export function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalizeChunkText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitOversizedUnit(unit: string, maxCharacters: number): string[] {
  const compactUnit = normalizeChunkText(unit);

  if (compactUnit.length <= maxCharacters) {
    return [compactUnit];
  }

  const sentenceParts = compactUnit
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentenceParts.length <= 1) {
    const words = compactUnit.split(/\s+/);
    const parts: string[] = [];
    let currentPart = "";

    words.forEach((word) => {
      const candidate = currentPart ? `${currentPart} ${word}` : word;

      if (candidate.length > maxCharacters && currentPart) {
        parts.push(currentPart.trim());
        currentPart = word;
        return;
      }

      currentPart = candidate;
    });

    if (currentPart) {
      parts.push(currentPart.trim());
    }

    return parts;
  }

  const parts: string[] = [];
  let currentPart = "";

  sentenceParts.forEach((sentence) => {
    const candidate = currentPart ? `${currentPart} ${sentence}` : sentence;

    if (candidate.length > maxCharacters && currentPart) {
      parts.push(currentPart.trim());
      currentPart = sentence;
      return;
    }

    currentPart = candidate;
  });

  if (currentPart) {
    parts.push(currentPart.trim());
  }

  return parts.flatMap((part) =>
    part.length > maxCharacters ? splitOversizedUnit(part, maxCharacters) : [part],
  );
}

function getNormalizedUnits(text: string, maxCharacters: number): string[] {
  const paragraphs = normalizeChunkText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.flatMap((paragraph) =>
    paragraph.length > maxCharacters
      ? splitOversizedUnit(paragraph, maxCharacters)
      : [paragraph],
  );
}

function getOverlapText(text: string, maxCharacters: number) {
  if (!text || maxCharacters <= 0) {
    return "";
  }

  const overlapSlice = text.slice(-maxCharacters).trim();
  const firstWhitespace = overlapSlice.indexOf(" ");

  if (firstWhitespace === -1 || firstWhitespace >= overlapSlice.length - 24) {
    return overlapSlice;
  }

  return overlapSlice.slice(firstWhitespace + 1).trim();
}

export function chunkMemoryText(
  text: string,
  options: ChunkMemoryOptions = {},
) {
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
  const overlapCharacters =
    options.overlapCharacters ?? DEFAULT_OVERLAP_CHARACTERS;
  const units = getNormalizedUnits(text, maxCharacters);
  const chunks: string[] = [];
  let currentChunk = "";

  units.forEach((unit) => {
    const candidate = currentChunk ? `${currentChunk}\n\n${unit}` : unit;

    if (!currentChunk || candidate.length <= maxCharacters) {
      currentChunk = candidate;
      return;
    }

    chunks.push(currentChunk.trim());

    const availableOverlap = Math.max(maxCharacters - unit.length - 2, 0);
    const overlapText = getOverlapText(
      currentChunk,
      Math.min(overlapCharacters, availableOverlap),
    );

    currentChunk = overlapText ? `${overlapText}\n\n${unit}` : unit;
  });

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks
    .map((chunk, index) => ({
      content: chunk,
      estimatedTokens: estimateTokenCount(chunk),
      sequence: index + 1,
    }))
    .filter((chunk) => chunk.content.length >= 80);
}
