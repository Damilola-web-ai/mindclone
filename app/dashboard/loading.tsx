import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-64 bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 bg-white/10" />
        <Skeleton className="h-32 bg-white/10" />
        <Skeleton className="h-32 bg-white/10" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-72 bg-white/10" />
        <Skeleton className="h-72 bg-white/10" />
      </div>
    </div>
  );
}
