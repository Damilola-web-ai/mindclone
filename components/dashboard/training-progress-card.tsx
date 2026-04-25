"use client";

const trainingStages = [
  {
    id: "uploading",
    label: "Uploading source to secure Supabase storage",
  },
  {
    id: "processing",
    label: "Parsing, chunking, embedding, and saving memory",
  },
] as const;

type TrainingProgressCardProps = {
  stage: (typeof trainingStages)[number]["id"] | null;
};

export function TrainingProgressCard({ stage }: TrainingProgressCardProps) {
  if (!stage) {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-50">
      <p className="font-medium text-emerald-100">Training in progress</p>
      <p className="mt-2 leading-6 text-emerald-100/80">
        MindClone is ingesting this source now. Keep this tab open while the file lands
        in storage and the server turns it into retrieval-ready memory.
      </p>
      <div className="mt-4 space-y-2">
        {trainingStages.map((item) => {
          const isActive = item.id === stage;
          const isComplete =
            item.id === "uploading" && stage === "processing";

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-black/10 px-3 py-2"
            >
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  isActive ? "animate-pulse bg-emerald-300" : "",
                  isComplete ? "bg-emerald-400" : "",
                  !isActive && !isComplete ? "bg-white/20" : "",
                ].join(" ")}
              />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
