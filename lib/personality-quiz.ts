export type QuizQuestion = {
  id: string;
  question: string;
  promptLabel: string;
  helper: string;
  placeholder: string;
  stepId: string;
};

export type QuizStep = {
  id: string;
  title: string;
  description: string;
};

export const ownerQuizSteps: QuizStep[] = [
  {
    id: "voice",
    title: "Voice and energy",
    description:
      "Capture how the owner comes across socially, what they naturally talk about, and how they handle friction.",
  },
  {
    id: "values",
    title: "Values and boundaries",
    description:
      "Define how the owner thinks, what they care about deeply, and where their hard lines are.",
  },
  {
    id: "messaging",
    title: "Messaging style",
    description:
      "Lock in how the owner sounds in real conversations, from texting patterns to the parts people misread.",
  },
];

export const ownerQuizQuestions: QuizQuestion[] = [
  {
    id: "friends_words",
    question: "How would your close friends describe you in 3 words?",
    promptLabel: "How close friends would describe them",
    helper: "These words shape the clone's default social vibe and emotional temperature.",
    placeholder: "Example: thoughtful, sharp, quietly intense",
    stepId: "voice",
  },
  {
    id: "favorite_topics",
    question: "What topics could you talk about for hours?",
    promptLabel: "Topics they can talk about for hours",
    helper: "This tells the clone where your natural enthusiasm and depth live.",
    placeholder: "Topics, rabbit holes, or recurring obsessions...",
    stepId: "voice",
  },
  {
    id: "disagreement_style",
    question: "How do you usually respond when someone disagrees with you?",
    promptLabel: "How they usually respond to disagreement",
    helper: "This helps the clone sound like you in tense, awkward, or challenging conversations.",
    placeholder: "Describe your tone, pacing, and what you usually do next...",
    stepId: "voice",
  },
  {
    id: "decision_style",
    question: "Are you more logical or emotional in decisions? Give an example.",
    promptLabel: "How they make decisions",
    helper: "The clone should think the way you think, not just talk the way you talk.",
    placeholder: "Explain how you usually decide and include a real example...",
    stepId: "values",
  },
  {
    id: "humor_style",
    question: "What's your humor like? (dry, sarcastic, wholesome, dark, etc.)",
    promptLabel: "What their humor feels like",
    helper: "Humor is one of the fastest ways people tell whether the clone feels right or off.",
    placeholder: "Describe your humor, timing, and what you avoid...",
    stepId: "values",
  },
  {
    id: "strong_opinions",
    question: "What are your strongest opinions about life, work, or people?",
    promptLabel: "Strong opinions about life, work, or people",
    helper: "This gives the clone an actual point of view instead of sounding neutral and generic.",
    placeholder: "Write the beliefs or opinions that feel most core to you...",
    stepId: "values",
  },
  {
    id: "strangers_vs_friends",
    question: "How do you talk to strangers vs close friends? Give examples.",
    promptLabel: "How they talk to strangers versus close friends",
    helper: "This helps the clone adapt tone naturally depending on how familiar the other person is.",
    placeholder: "Explain the difference in warmth, openness, slang, or honesty...",
    stepId: "values",
  },
  {
    id: "boundaries",
    question: "What would you never say or do? What are your hard boundaries?",
    promptLabel: "Hard boundaries and what they would never say or do",
    helper: "These are guardrails. The clone should avoid violating them even under pressure.",
    placeholder: "List the lines you do not cross and the tone you avoid...",
    stepId: "messaging",
  },
  {
    id: "texting_style",
    question:
      "Describe your texting or messaging style (short replies, long essays, emojis, etc.)",
    promptLabel: "Their texting and messaging style",
    helper: "This shapes sentence length, rhythm, punctuation, emoji use, and how conversational the clone feels.",
    placeholder: "Describe how you actually message people in real life...",
    stepId: "messaging",
  },
  {
    id: "misunderstood_trait",
    question: "What's something most people get wrong about you?",
    promptLabel: "Something most people get wrong about them",
    helper: "This helps the clone capture your nuance instead of flattening you into a stereotype.",
    placeholder: "Share the thing people often misunderstand and what is actually true...",
    stepId: "messaging",
  },
];

export type QuizAnswers = Record<string, string>;

export function createEmptyQuizAnswers(): QuizAnswers {
  return ownerQuizQuestions.reduce<QuizAnswers>((accumulator, question) => {
    accumulator[question.id] = "";
    return accumulator;
  }, {});
}

export function mergeQuizAnswers(
  savedAnswers?: Partial<QuizAnswers> | null,
): QuizAnswers {
  const mergedAnswers = createEmptyQuizAnswers();

  Object.entries(savedAnswers ?? {}).forEach(([key, value]) => {
    mergedAnswers[key] = value ?? "";
  });

  return mergedAnswers;
}

export function mapQuestionToId(questionText: string) {
  const question = ownerQuizQuestions.find(
    (currentQuestion) => currentQuestion.question === questionText,
  );

  return question?.id ?? null;
}

export function countCompletedAnswers(answers: QuizAnswers) {
  return ownerQuizQuestions.filter((question) => {
    return Boolean(answers[question.id]?.trim());
  }).length;
}

export function getQuestionsForStep(stepId: string) {
  return ownerQuizQuestions.filter((question) => question.stepId === stepId);
}

function formatAnswer(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "Not provided yet.";
}

export function buildPersonalitySystemPrompt({
  ownerName,
  answers,
}: {
  ownerName: string;
  answers: QuizAnswers;
}) {
  const safeOwnerName = ownerName.trim() || "the owner";

  const personalityLines = ownerQuizQuestions
    .map((question) => {
      return `- ${question.promptLabel}: ${formatAnswer(answers[question.id] ?? "")}`;
    })
    .join("\n");

  return `You are ${safeOwnerName}. You think and speak exactly like them.

You are not a generic assistant loosely inspired by ${safeOwnerName}. You are speaking as them in first person and should sound recognizably like them in tone, rhythm, perspective, humor, and emotional posture.

[PERSONALITY PROFILE]
${personalityLines}

[CONVERSATION RULES]
- Always respond in first person as ${safeOwnerName}.
- Match their exact texting and messaging style.
- Match how they talk differently to strangers versus close friends.
- Stay inside their hard boundaries and never violate them.
- Let their strongest opinions and decision style shape how they answer.
- Use humor only in the way their answers describe it.
- If you are unsure, say you are not sure in a way that still sounds like ${safeOwnerName}.
- Never break character.
- Never say you are an AI unless someone asks directly and seriously whether this is the real ${safeOwnerName}.
- Do not invent personal facts that are not supported by the quiz, corrections, or memory context.`;
}
