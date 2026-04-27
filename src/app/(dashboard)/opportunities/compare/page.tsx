"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { ScoreBar } from "@/components/shared/score-bar";
import { findOpportunity } from "@/mock/data";
import { formatUsd, timeAgo } from "@/lib/utils/format";
import { SCORE_DIMENSIONS } from "@/lib/utils/constants";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading…</div>}>
      <CompareView />
    </Suspense>
  );
}

function CompareView() {
  const params = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  const opps = ids.map((id) => findOpportunity(id)).filter(Boolean) as NonNullable<ReturnType<typeof findOpportunity>>[];

  if (opps.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/opportunities">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          Select 2–4 opportunities from the grid, then click Compare in the bulk-action bar.
        </div>
      </div>
    );
  }

  // Find which dimension wins per opp
  const winners: Record<string, string> = {};
  for (const dim of SCORE_DIMENSIONS) {
    const dimKey = dim.key;
    const inverted = dimKey === "competition" || dimKey === "buildEffort";
    const best = opps.reduce((best, o) => {
      const v = o.scoreBreakdown.dimensions[dimKey].value;
      const cmp = inverted ? -v : v;
      const bestV = inverted
        ? -best.scoreBreakdown.dimensions[dimKey].value
        : best.scoreBreakdown.dimensions[dimKey].value;
      return cmp > bestV ? o : best;
    }, opps[0]!);
    winners[dimKey] = best.id;
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/opportunities">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to opportunities
        </Link>
      </Button>

      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        Comparing {opps.length} opportunit{opps.length === 1 ? "y" : "ies"}
      </h1>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${opps.length}, minmax(0, 1fr))` }}
      >
        {opps.map((o) => (
          <Card key={o.id} className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <ScoreBadge score={o.score} size="lg" />
                <Badge variant="outline" className="text-[10px]">
                  {o.status}
                </Badge>
              </div>
              <CardTitle className="line-clamp-2 mt-2 text-base">{o.title}</CardTitle>
              <p className="line-clamp-3 text-xs text-slate-400">{o.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Cell label="Niche" value={o.niche.replace(/_/g, " ")} />
                <Cell label="Type" value={o.opportunityType.replace(/_/g, " ")} />
                <Cell label="Effort" value={o.buildEffort.replace(/_/g, " ")} />
                <Cell label="Created" value={timeAgo(o.createdAt)} />
                <Cell
                  label="Projected"
                  value={formatUsd(o.projectedRevenueUsd, { compact: true })}
                  highlight
                />
                <Cell label="Created by" value={o.createdBy} />
              </div>
              <div className="border-t border-slate-800 pt-3">
                <ScoreBar breakdown={o.scoreBreakdown} />
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/opportunities/${o.id}`}>Open detail →</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle>Wins per dimension</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Dimension</th>
                  {opps.map((o) => (
                    <th key={o.id} className="py-2">
                      <span className="block max-w-[160px] truncate">{o.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_DIMENSIONS.map((dim) => (
                  <tr key={dim.key} className="border-b border-slate-800/60">
                    <td className="py-2 text-xs text-slate-400">{dim.label}</td>
                    {opps.map((o) => {
                      const v = o.scoreBreakdown.dimensions[dim.key].value;
                      const won = winners[dim.key] === o.id;
                      return (
                        <td key={o.id} className="py-2">
                          <span className={`flex items-center gap-1 ${won ? "text-emerald-400" : "text-slate-300"}`}>
                            {won ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3 opacity-30" />}
                            <span className="font-mono">{v}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-b border-slate-800/60 font-semibold">
                  <td className="py-2 text-xs text-slate-400">Final score</td>
                  {opps.map((o) => (
                    <td key={o.id} className="py-2">
                      <ScoreBadge score={o.score} size="sm" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm ${highlight ? "font-semibold text-emerald-400" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}
