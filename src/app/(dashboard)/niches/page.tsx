"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid3X3, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RechartsTreemap } from "@/components/shared/recharts-treemap";
import { mockNiches } from "@/mock/data";
import { formatNumber } from "@/lib/utils/format";

function colorForMomentum(score: number) {
  if (score >= 80) return "rgba(16,185,129,0.6)";
  if (score >= 60) return "rgba(56,189,248,0.55)";
  if (score >= 40) return "rgba(251,191,36,0.5)";
  if (score >= 20) return "rgba(249,115,22,0.45)";
  return "rgba(244,63,94,0.4)";
}

export default function NichesPage() {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "treemap">("grid");
  const niches = [...mockNiches].sort((a, b) => b.momentumScore - a.momentumScore);

  const treemapData = niches.map((n) => ({
    name: n.label,
    value: Math.max(1, n.opportunityCount * 4 + n.productCount),
    color: colorForMomentum(n.momentumScore),
    href: `/niches/${n.slug}`,
    meta: `momentum ${n.momentumScore} · ${n.opportunityCount} opps · ${n.productCount} products`,
  }));

  return (
    <>
      <PageHeader
        title="Niches"
        description="Heat-map of all 20 niches by momentum and depth."
        actions={
          <div className="flex gap-1 rounded-md border border-slate-800 p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={view === "treemap" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("treemap")}
              aria-label="Treemap view"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {view === "treemap" ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Niche treemap</CardTitle>
            <CardDescription>
              Cell size scales with depth (opportunity + product count). Color reflects momentum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RechartsTreemap
              data={treemapData}
              height={520}
              onClick={(c) => c.href && router.push(c.href)}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
              <Legend color="rgba(244,63,94,0.4)" label="0–19" />
              <Legend color="rgba(249,115,22,0.45)" label="20–39" />
              <Legend color="rgba(251,191,36,0.5)" label="40–59" />
              <Legend color="rgba(56,189,248,0.55)" label="60–79" />
              <Legend color="rgba(16,185,129,0.6)" label="80–100" />
              <span className="ml-2 text-slate-500">momentum scale</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {niches.map((n) => {
            const tone =
              n.momentumScore >= 80
                ? "bg-emerald-500/10 border-emerald-500/30"
                : n.momentumScore >= 60
                  ? "bg-sky-500/10 border-sky-500/30"
                  : n.momentumScore >= 40
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-slate-900/40 border-slate-800";
            return (
              <Link key={n.id} href={`/niches/${n.slug}`}>
                <Card className={`h-full transition-colors hover:border-primary/50 ${tone}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold">{n.label}</div>
                      <Badge variant="info" className="font-mono text-[10px]">
                        {n.momentumScore}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{n.description}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatNumber(n.productCount)} products</span>
                      <span>{n.opportunityCount} opps</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
