import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 bg-white/10" />
        <Skeleton className="h-10 w-72 bg-white/10" />
        <Skeleton className="h-5 w-full max-w-3xl bg-white/10" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="border-white/10 bg-white/[0.03] text-white shadow-none">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3 w-28 bg-white/10" />
              <Skeleton className="h-10 w-24 bg-white/10" />
              <Skeleton className="h-4 w-full bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          {[1, 2].map((item) => (
            <Card key={item} className="border-white/10 bg-white/[0.03] text-white shadow-none">
              <CardHeader>
                <Skeleton className="h-4 w-44 bg-white/10" />
                <CardTitle>
                  <Skeleton className="h-6 w-56 bg-white/10" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
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

        <div className="space-y-5">
          {[1, 2].map((item) => (
            <Card key={item} className="border-white/10 bg-white/[0.03] text-white shadow-none">
              <CardHeader>
                <Skeleton className="h-4 w-40 bg-white/10" />
                <CardTitle>
                  <Skeleton className="h-6 w-52 bg-white/10" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4"
                  >
                    <Skeleton className="h-4 w-36 bg-white/10" />
                    <Skeleton className="mt-3 h-3 w-full bg-white/10" />
                    <Skeleton className="mt-2 h-3 w-4/5 bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
