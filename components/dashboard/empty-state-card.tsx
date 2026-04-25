import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateCardProps = {
  title: string;
  description: string;
  hint?: string;
};

export function EmptyStateCard({
  title,
  description,
  hint,
}: EmptyStateCardProps) {
  return (
    <Card className="border-dashed border-white/15 bg-white/[0.03] text-white shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-400">
        <p className="leading-7">{description}</p>
        {hint ? (
          <p className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-emerald-100/80">
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
