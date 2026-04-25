import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardWorkspaceLoadingProps = {
  includeTable?: boolean;
  leftCards?: number;
  rightCards?: number;
  statCount?: number;
};

export function DashboardWorkspaceLoading({
  includeTable = false,
  leftCards = 1,
  rightCards = 1,
  statCount = 0,
}: DashboardWorkspaceLoadingProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 bg-white/10" />
        <Skeleton className="h-10 w-full max-w-xl bg-white/10" />
        <Skeleton className="h-5 w-full max-w-3xl bg-white/10" />
      </div>

      {statCount > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: statCount }).map((_, index) => (
            <Card
              key={`stat-${index}`}
              className="border-white/10 bg-white/[0.03] text-white shadow-none"
            >
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-3 w-28 bg-white/10" />
                <Skeleton className="h-10 w-24 bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-5">
          {Array.from({ length: leftCards }).map((_, index) => (
            <Card
              key={`left-${index}`}
              className="border-white/10 bg-white/[0.03] text-white shadow-none"
            >
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-36 bg-white/10" />
                <Skeleton className="h-7 w-60 bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div
                    key={`left-${index}-row-${rowIndex}`}
                    className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                  >
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="mt-3 h-3 w-full bg-white/10" />
                    <Skeleton className="mt-2 h-3 w-4/5 bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-5">
          {Array.from({ length: rightCards }).map((_, index) => (
            <Card
              key={`right-${index}`}
              className="border-white/10 bg-white/[0.03] text-white shadow-none"
            >
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-40 bg-white/10" />
                <Skeleton className="h-7 w-64 bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div
                    key={`right-${index}-row-${rowIndex}`}
                    className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                  >
                    <Skeleton className="h-4 w-40 bg-white/10" />
                    <Skeleton className="mt-3 h-3 w-full bg-white/10" />
                    <Skeleton className="mt-4 h-2 w-full rounded-full bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {includeTable ? (
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-4 w-40 bg-white/10" />
            <Skeleton className="h-7 w-56 bg-white/10" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`table-${index}`}
                className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Skeleton className="h-4 w-40 bg-white/10" />
                  <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
                </div>
                <Skeleton className="mt-3 h-3 w-full bg-white/10" />
                <Skeleton className="mt-2 h-3 w-3/4 bg-white/10" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
