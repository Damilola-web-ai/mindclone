import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-none">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm leading-6 text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}
