"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Plus, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { mockOpportunities } from "@/mock/data";
import {
  NICHE_LIST,
  OPPORTUNITY_TYPES,
  BUILD_EFFORTS,
  PRODUCT_STATUSES,
} from "@/lib/utils/constants";
import { formatUsd, timeAgo } from "@/lib/utils/format";

export default function OpportunitiesPage() {
  const [niche, setNiche] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [effort, setEffort] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score" | "newest" | "revenue">("score");

  const filtered = useMemo(() => {
    let rows = mockOpportunities.slice();
    if (niche) rows = rows.filter((o) => o.niche === niche);
    if (type) rows = rows.filter((o) => o.opportunityType === type);
    if (effort) rows = rows.filter((o) => o.buildEffort === effort);
    if (status) rows = rows.filter((o) => o.status === status);
    if (minScore > 0) rows = rows.filter((o) => o.score >= minScore);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((o) => o.title.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q));
    }
    if (sort === "score") rows.sort((a, b) => b.score - a.score);
    if (sort === "revenue") rows.sort((a, b) => b.projectedRevenueUsd - a.projectedRevenueUsd);
    if (sort === "newest") rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows;
  }, [niche, type, effort, status, minScore, search, sort]);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description={`${filtered.length} of ${mockOpportunities.length} ranked across niches.`}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/brain"><Sparkles className="mr-1 h-4 w-4" /> Synthesize new</Link>
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add manually
            </Button>
          </>
        }
      />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or summary…"
              className="h-9 max-w-md border-slate-800 bg-slate-950"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-md border border-slate-800 bg-slate-950 px-2 text-sm"
            >
              <option value="score">Sort: Score</option>
              <option value="newest">Sort: Newest</option>
              <option value="revenue">Sort: Revenue</option>
            </select>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="h-3 w-3" /> Min score
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-32"
              />
              <span className="w-6 font-mono text-slate-300">{minScore}</span>
            </div>
          </div>
          <div className="space-y-2">
            <FilterChips
              options={NICHE_LIST.map((n) => ({ value: n.value, label: n.label }))}
              value={niche}
              onChange={setNiche}
              emptyLabel="All niches"
            />
            <FilterChips
              options={OPPORTUNITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={type}
              onChange={setType}
              emptyLabel="All types"
            />
            <FilterChips
              options={BUILD_EFFORTS.map((b) => ({ value: b.value, label: b.label }))}
              value={effort}
              onChange={setEffort}
              emptyLabel="Any effort"
            />
            <FilterChips
              options={PRODUCT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              value={status}
              onChange={setStatus}
              emptyLabel="Any status"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((o) => (
          <Link key={o.id} href={`/opportunities/${o.id}`}>
            <Card className="group h-full border-slate-800 bg-slate-900/40 transition-colors hover:border-primary/40 hover:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <ScoreBadge score={o.score} />
                    <Badge variant="outline" className="text-[10px]">
                      {o.opportunityType.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Sun className="mr-1 h-3 w-3" /> {o.buildEffort.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                  >
                    {o.status}
                  </Badge>
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                  {o.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{o.summary}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400">
                    {formatUsd(o.projectedRevenueUsd, { compact: true })}
                  </span>
                  <span>{timeAgo(o.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No opportunities match your filters. Loosen the filters above.
          </div>
        ) : null}
      </div>
    </>
  );
}
