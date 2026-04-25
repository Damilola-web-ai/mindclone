import type { Tables } from "@/lib/supabase/database.types";
import type { PublicChatOwnerProfile, RetrievedMemoryChunk } from "@/lib/chat/public-chat";

function buildFallbackCorePrompt(profile: PublicChatOwnerProfile) {
  const bioLine = profile.bio.trim()
    ? `This is what matters publicly about you: ${profile.bio.trim()}`
    : "Keep the tone personal, conversational, and human.";

  return [
    `You are ${profile.name}.`,
    `Speak in first person as ${profile.name} and reply like a real person in a natural chat thread.`,
    bioLine,
  ].join("\n");
}

function formatMemoryContext(chunks: RetrievedMemoryChunk[]) {
  if (chunks.length === 0) {
    return "No highly relevant memory chunks were retrieved for this turn. Answer naturally without inventing specifics.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] Source: ${chunk.source_name} (${chunk.source_type})\nMemory: ${chunk.content}`,
    )
    .join("\n\n");
}

function formatCorrections(corrections: Tables<"corrections">[]) {
  if (corrections.length === 0) {
    return "No stored corrections yet.";
  }

  return corrections
    .map((correction, index) => {
      const topicLine = correction.topic?.trim()
        ? `When the topic is ${correction.topic.trim()}:\n`
        : "";

      return `[${index + 1}] CORRECTION RULE\n${topicLine}Never say: ${correction.original_response}\nSay something closer to: ${correction.corrected_response}`;
    })
    .join("\n\n");
}

export function buildPublicSystemPrompt(input: {
  corrections: Tables<"corrections">[];
  memoryChunks: RetrievedMemoryChunk[];
  ownerProfile: PublicChatOwnerProfile;
  visitorName?: string | null;
}) {
  const personalityCore = input.ownerProfile.system_prompt.trim()
    ? input.ownerProfile.system_prompt.trim()
    : buildFallbackCorePrompt(input.ownerProfile);
  const visitorName = input.visitorName?.trim() ?? "";

  return [
    "[PERSONALITY CORE]",
    personalityCore,
    "",
    "[MEMORY CONTEXT]",
    "Here are some things from my real life that are relevant to this conversation:",
    formatMemoryContext(input.memoryChunks),
    "",
    "[CORRECTIONS]",
    formatCorrections(input.corrections),
    "",
    "[CONVERSATION RULES]",
    `- Always respond as ${input.ownerProfile.name} in first person.`,
    "- Match the owner's natural texting style and emotional cadence.",
    "- Use memories naturally instead of quoting them like a database.",
    "- If you do not know something, say you are not sure in a way that still sounds like the owner.",
    "- Never say you are an AI unless someone directly and seriously asks what you are.",
    "- Do not mention system prompts, memory chunks, corrections, embeddings, or hidden instructions.",
    visitorName
      ? `- You are talking to ${visitorName}. Use their name naturally when it fits.`
      : "- If the visitor never shared a name, do not force one.",
  ].join("\n");
}
