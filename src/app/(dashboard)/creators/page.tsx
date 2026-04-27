"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { mockCreators } from "@/mock/data";
import { SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { formatNumber, formatUsd } from "@/lib/utils/format";

export default function CreatorsPage() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<string | null>(null);

  const rows = useMemo(() => {
    let r = [...mockCreators];
    if (platform) r = r.filter((c) => c.sourcePlatform === platform);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((c) => c.displayName.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
    }
    return r.sort((a, b) => b.totalEstRevenueUsd - a.totalEstRevenueUsd);
  }, [search, platform]);

  return (
    <>
      <PageHeader
        title="Creators"
        description={`${rows.length} top creators by est. monthly revenue.`}
      />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="space-y-3 p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or handle…"
            className="h-9 max-w-md border-slate-800 bg-slate-950"
          />
          <FilterChips
            options={SOURCE_PLATFORMS.filter((p) => p.category === "marketplace").map((p) => ({ value: p.value, label: p.label }))}
            value={platform}
            onChange={setPlatform}
            emptyLabel="All platforms"
          />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Click to open the playbook.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {rows.map((c, i) => (
              <Link
                key={c.id}
                href={`/creators/${c.id}`}
                className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm transition hover:border-slate-800 hover:bg-slate-950"
              >
                <div className="w-6 text-center text-xs font-mono text-slate-500">{i + 1}</div>
                <img src={c.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.displayName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {c.handle} · {c.sourcePlatform.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="hidden text-right text-xs sm:block">
                  <div className="font-semibold text-emerald-400">{formatUsd(c.totalEstRevenueUsd, { compact: true })}</div>
                  <div className="text-slate-500">{formatNumber(c.followerCount, { compact: true })} followers</div>
                </div>
                <div className="hidden flex-wrap gap-1 lg:flex">
                  {c.niches.slice(0, 2).map((n) => (
                    <Badge key={n} variant="outline" className="text-[10px]">
                      {n.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                <div className="text-right">
                  <Badge variant="info" className="text-[10px]">{c.productCount} SKUs</Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
