import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface Props {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "info";
  hint?: string;
}

export function KpiCard({ label, value, delta, icon: Icon, tone = "default", hint }: Props) {
  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          {Icon ? (
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                tone === "positive" && "bg-emerald-500/10 text-emerald-400",
                tone === "negative" && "bg-rose-500/10 text-rose-400",
                tone === "info" && "bg-sky-500/10 text-sky-400",
                tone === "default" && "bg-slate-800 text-slate-300",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        {delta || hint ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {delta ? (
              <span
                className={cn(
                  delta.startsWith("+") && "text-emerald-400",
                  delta.startsWith("-") && "text-rose-400",
                )}
              >
                {delta}
              </span>
            ) : null}
            {hint ? <span>{hint}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
