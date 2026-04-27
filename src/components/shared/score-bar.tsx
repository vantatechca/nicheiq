import type { ScoreBreakdown } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { SCORE_DIMENSIONS } from "@/lib/utils/constants";

interface Props {
  breakdown: ScoreBreakdown;
}

export function ScoreBar({ breakdown }: Props) {
  return (
    <div className="space-y-3">
      {SCORE_DIMENSIONS.map(({ key, label, weight }) => {
        const dim = breakdown.dimensions[key];
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{label}</span>
              <span className="font-mono text-slate-400">
                {dim.value} <span className="opacity-50">· w {weight}</span>
              </span>
            </div>
            <Progress value={dim.value} className="h-1.5 bg-slate-800" />
            {dim.rationale ? <div className="mt-1 text-[10px] text-slate-500">{dim.rationale}</div> : null}
          </div>
        );
      })}
      {breakdown.ruleModifiers.length > 0 ? (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200">
          <div className="font-medium">Rule modifiers</div>
          {breakdown.ruleModifiers.map((m) => (
            <div key={m.ruleId}>
              {m.label}: {m.delta > 0 ? "+" : ""}
              {m.delta} ({m.ruleType})
            </div>
          ))}
        </div>
      ) : null}
      {breakdown.patternModifiers.length > 0 ? (
        <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-2 text-[11px] text-violet-200">
          <div className="font-medium">Feedback patterns</div>
          {breakdown.patternModifiers.map((m) => (
            <div key={m.patternId}>
              {m.label}: {m.delta > 0 ? "+" : ""}
              {m.delta}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
