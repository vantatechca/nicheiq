"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { mockNiches } from "@/mock/data";
import { formatNumber } from "@/lib/utils/format";

export default function NichesPage() {
  const niches = [...mockNiches].sort((a, b) => b.momentumScore - a.momentumScore);
  return (
    <>
      <PageHeader title="Niches" description="Heat-map of all 20 niches by momentum and depth." />
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
    </>
  );
}
