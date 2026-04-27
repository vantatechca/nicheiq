"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Sparkles, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { OpportunityCreateDialog } from "@/components/opportunity/create-dialog";
import { mockOpportunities } from "@/mock/data";
import {
  NICHE_LIST,
  OPPORTUNITY_TYPES,
  BUILD_EFFORTS,
  PRODUCT_STATUSES,
} from "@/lib/utils/constants";
import { formatUsd, timeAgo } from "@/lib/utils/format";

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading…</div>}>
      <OpportunitiesView />
    </Suspense>
  );
}

function OpportunitiesView() {
  const router = useRouter();
  const params = useSearchParams();

  const [niche, setNiche] = useState<string | null>(params.get("niche"));
  const [type, setType] = useState<string | null>(params.get("type"));
  const [effort, setEffort] = useState<string | null>(params.get("effort"));
  const [status, setStatus] = useState<string | null>(params.get("status"));
  const [minScore, setMinScore] = useState(Number(params.get("minScore") ?? 0));
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<"score" | "newest" | "revenue">(
    (params.get("sort") as "score" | "newest" | "revenue") ?? "score",
  );

  // selection state for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sync filters to URL (no scroll)
  useEffect(() => {
    const u = new URLSearchParams();
    if (niche) u.set("niche", niche);
    if (type) u.set("type", type);
    if (effort) u.set("effort", effort);
    if (status) u.set("status", status);
    if (minScore > 0) u.set("minScore", String(minScore));
    if (search.trim()) u.set("q", search.trim());
    if (sort !== "score") u.set("sort", sort);
    const qs = u.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [niche, type, effort, status, minScore, search, sort, router]);

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

  const allOnPage = filtered.map((o) => o.id);
  const allSelected = selected.size > 0 && allOnPage.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allOnPage));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAllFilters() {
    setNiche(null);
    setType(null);
    setEffort(null);
    setStatus(null);
    setMinScore(0);
    setSearch("");
    setSort("score");
  }

  async function bulkAction(label: string) {
    if (selected.size === 0) return;
    toast.success(`${label} ${selected.size} opportunit${selected.size === 1 ? "y" : "ies"} (mock)`);
    setSelected(new Set());
  }

  const filterCount = [niche, type, effort, status].filter(Boolean).length + (minScore > 0 ? 1 : 0);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description={`${filtered.length} of ${mockOpportunities.length} ranked across niches.`}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/brain">
                <Sparkles className="mr-1 h-4 w-4" /> Synthesize new
              </Link>
            </Button>
            <OpportunityCreateDialog />
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
            {filterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="mr-1 h-3 w-3" /> Clear {filterCount} filter{filterCount === 1 ? "" : "s"}
              </Button>
            ) : null}
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

      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium text-primary">{selected.size} selected</span>
          {selected.size >= 2 && selected.size <= 4 ? (
            <Button size="sm" asChild>
              <Link href={`/opportunities/compare?ids=${Array.from(selected).join(",")}`}>Compare</Link>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => bulkAction("Shortlisted")}>
            Shortlist
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("Marked building")}>
            Mark building
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("Abandoned")}>
            Abandon
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("Archived")}>
            Archive
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-3 w-3 cursor-pointer"
          aria-label="Select all"
        />
        Select all on page
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((o) => {
          const isSelected = selected.has(o.id);
          return (
            <Card
              key={o.id}
              className={`group h-full border-slate-800 bg-slate-900/40 transition-colors hover:border-primary/40 hover:bg-slate-900 ${
                isSelected ? "border-primary/60 ring-1 ring-primary/30" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(o.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-3 w-3 cursor-pointer"
                    aria-label={`Select ${o.title}`}
                  />
                  <Link href={`/opportunities/${o.id}`} className="flex-1">
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
                      <Badge variant="outline" className="text-[10px]">
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
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-800 p-12 text-center">
            <p className="text-sm text-slate-400">No opportunities match your filters.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear filters
              </Button>
              <OpportunityCreateDialog
                trigger={
                  <Button size="sm">
                    Add manually
                  </Button>
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
