import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicChatLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="surface-border overflow-hidden">
          <CardHeader className="space-y-4">
            <Skeleton className="h-6 w-32 bg-white/80" />
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full bg-white/80" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-40 bg-white/80" />
                <Skeleton className="h-4 w-full max-w-sm bg-white/70" />
                <Skeleton className="h-4 w-4/5 bg-white/70" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full bg-white/70" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-28 w-full bg-white/70" />
              <Skeleton className="h-28 w-full bg-white/70" />
            </div>
            <Skeleton className="h-44 w-full bg-white/70" />
          </CardContent>
        </Card>

        <Card className="surface-border overflow-hidden">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-32 bg-white/80" />
            <Skeleton className="h-8 w-72 bg-white/80" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.9rem] bg-[linear-gradient(180deg,#f8f0e7,#efe4d5)] p-4 sm:p-5">
              <div className="space-y-4">
                <div className="flex justify-start">
                  <Skeleton className="h-24 w-[78%] bg-white/80" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-20 w-[70%] bg-[#127363]/30" />
                </div>
                <div className="flex justify-start">
                  <Skeleton className="h-28 w-[82%] bg-white/80" />
                </div>
              </div>
            </div>
            <Skeleton className="h-44 w-full bg-white/80" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
