export const personalityLayers = [
  {
    name: "Layer 1",
    description: "Personality core",
    detail:
      "Quiz answers become a durable prompt describing how the owner thinks, jokes, argues, and communicates.",
  },
  {
    name: "Layer 2",
    description: "Memory bank",
    detail:
      "Uploaded chats, journals, and voice notes are chunked, embedded, and retrieved as grounded conversation context.",
  },
  {
    name: "Layer 3",
    description: "Live reinforcement",
    detail:
      "Owner corrections become permanent rules so the clone keeps getting closer to the real person over time.",
  },
];

export const dashboardMilestones = [
  {
    step: "Step 1",
    title: "Foundation scaffold",
    status: "complete",
    description:
      "Next.js 14, Tailwind, shadcn-style primitives, route shells, and the first responsive UI pass.",
  },
  {
    step: "Step 2",
    title: "Supabase and roles",
    status: "complete",
    description:
      "Supabase auth foundations, a single-owner constraint, pgvector tables, storage buckets, and RLS policies are now in place.",
  },
  {
    step: "Step 3",
    title: "Owner auth and protection",
    status: "complete",
    description:
      "The owner sign-up and sign-in flow exists now, and the dashboard redirects non-owners back to the auth screen.",
  },
  {
    step: "Step 4",
    title: "Quiz onboarding",
    status: "complete",
    description:
      "Quiz answers now persist to Supabase, and the owner can generate and edit the core personality system prompt.",
  },
  {
    step: "Step 5",
    title: "Training pipeline",
    status: "complete",
    description:
      "Owner uploads now parse documents, transcribe voice notes, chunk memory, generate embeddings, and store retrieval-ready vectors in Supabase.",
  },
  {
    step: "Step 6",
    title: "Visitor chat",
    status: "complete",
    description:
      "Public profile flow, RAG retrieval, Gemini streaming, stored conversations, and the live visitor chat UI are now in place.",
  },
  {
    step: "Step 7",
    title: "Owner private mode",
    status: "complete",
    description:
      "The owner can now use a private assistant workspace backed by the same clone, plus private notes, tasks, and reminders.",
  },
  {
    step: "Step 8",
    title: "Correction system",
    status: "complete",
    description:
      "Owners can now review visitor transcripts, save corrections, and turn them into durable rules that shape future replies.",
  },
  {
    step: "Step 9",
    title: "Analytics dashboard",
    status: "complete",
    description:
      "Owners can now review visitor volume, message counts, recurring themes, source usage, and recent transcripts from one analytics workspace.",
  },
  {
    step: "Step 10",
    title: "Profile and public settings",
    status: "complete",
    description:
      "The owner can now manage the public profile, greeting, photo, share link, visitor rules, and private password gate from the dashboard.",
  },
  {
    step: "Step 11",
    title: "UI polish and empty states",
    status: "complete",
    description:
      "Mobile behavior, toasts, route-level loading states, and the last layer of product polish now carry across the app.",
  },
  {
    step: "Step 12",
    title: "Deployment",
    status: "complete",
    description:
      "Vercel deployment scripts, health checks, runtime limits, and rollout docs are now in place so the app is release-ready once real credentials are connected.",
  },
];

export const trainingSources = [
  {
    label: "WhatsApp exports",
    formats: ".txt",
    note: "Captures cadence, shorthand, and the way real conversations unfold.",
  },
  {
    label: "Journal entries",
    formats: ".txt, .pdf",
    note: "Adds inner voice, reflection patterns, and emotional context.",
  },
  {
    label: "Voice notes",
    formats: ".mp3, .m4a",
    note: "Will be transcribed with Whisper so spoken phrasing becomes searchable memory.",
  },
  {
    label: "Twitter or X archives",
    formats: ".json",
    note: "Brings public opinions, phrasing habits, and recurring themes into the clone.",
  },
  {
    label: "General writing",
    formats: ".txt, .pdf, .docx",
    note: "Covers essays, notes, drafts, and anything else that sounds like the owner.",
  },
];
