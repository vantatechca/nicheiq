"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Sparkline } from "@/components/shared/sparkline";
import { mockTrends } from "@/mock/data";
import { formatNumber, formatPct } from "@/lib/utils/format";
import { FilterChips } from "@/components/shared/filter-chips";
import { NICHE_LIST } from "@/lib/utils/constants";

export default function TrendsPage() {
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState<string | null>(null);
  let rows = [...mockTrends];
  if (niche) rows = rows.filter((t) => t.niche === niche);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((t) => t.keyword.toLowerCase().includes(q));
  }
  rows.sort((a, b) => b.growthPct - a.growthPct);

  return (
    <>
      <PageHeader title="Trends" description={`${rows.length} keywords tracked across geos.`} />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="space-y-3 p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords…"
            className="h-9 max-w-md border-slate-800 bg-slate-950"
          />
          <FilterChips
            options={NICHE_LIST.map((n) => ({ value: n.value, label: n.label }))}
            value={niche}
            onChange={setNiche}
            emptyLabel="All niches"
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => (
          <Card key={t.id} className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.keyword}</CardTitle>
                <Badge
                  variant={t.growthPct >= 0 ? "success" : "destructive"}
                  className="font-mono"
                >
                  {formatPct(t.growthPct, { signed: true })}
                </Badge>
              </div>
              <CardDescription>
                {t.niche.replace(/_/g, " ")} · {t.geo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline
                data={t.series}
                width={320}
                height={56}
                color={t.growthPct >= 0 ? "rgb(52,211,153)" : "rgb(244,63,94)"}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Cell label="Momentum" value={String(t.momentumScore)} />
                <Cell label="7d vol" value={formatNumber(t.volume7d, { compact: true })} />
                <Cell label="30d vol" value={formatNumber(t.volume30d, { compact: true })} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
