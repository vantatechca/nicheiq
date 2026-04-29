"use client";

// Client component — receives filtered opportunities + filter state from the
// server component as props. Updates URL params on filter changes, which causes
// the server component to re-render with new data.
//
// Search input is debounced locally before pushing to URL. Selection state
// stays in client state (useState) since it's purely UI.

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
import { SavedViews, type OpportunityFilters } from "@/components/opportunity/saved-views";
import {
  NICHE_LIST,
  OPPORTUNITY_TYPES,
  BUILD_EFFORTS,
  PRODUCT_STATUSES,
} from "@/lib/utils/constants";
import { formatUsd, timeAgo } from "@/lib/utils/format";
import type { Opportunity } from "@/lib/types";

interface Filters {
  niche: string | null;
  type: string | null;
  effort: string | null;
  status: string | null;
  minScore: number;
  search: string;
  sort: "score" | "newest" | "revenue";
}

interface Props {
  opportunities: Opportunity[];
  total: number;
  filters: Filters;
}

export function OpportunitiesView({ opportunities, total, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local search state — debounced before pushing to URL.
  const [searchInput, setSearchInput] = useState(filters.search);

  // Selection state — purely client-side.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const updateFilter = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const u = new URLSearchParams();
      if (next.niche) u.set("niche", next.niche);
      if (next.type) u.set("type", next.type);
      if (next.effort) u.set("effort", next.effort);
      if (next.status) u.set("status", next.status);
      if (next.minScore > 0) u.set("minScore", String(next.minScore));
      if (next.search.trim()) u.set("q", next.search.trim());
      if (next.sort !== "score") u.set("sort", next.sort);
      const qs = u.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, pathname, router],
  );

  // Debounce search input → URL
  useEffect(() => {
    if (searchInput === filters.search) return;
    const t = setTimeout(() => updateFilter({ search: searchInput }), 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.search, updateFilter]);

  function clearAllFilters() {
    setSearchInput("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const allOnPage = opportunities.map((o) => o.id);
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

  async function bulkAction(label: string) {
    if (selected.size === 0) return;
    toast.success(`${label} ${selected.size} opportunit${selected.size === 1 ? "y" : "ies"} (mock)`);
    setSelected(new Set());
  }

  const filterCount =
    [filters.niche, filters.type, filters.effort, filters.status].filter(Boolean).length +
    (filters.minScore > 0 ? 1 : 0);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description={`${opportunities.length} of ${total} ranked across niches.`}
        actions={
          <>
            <SavedViews
              current={
                {
                  niche: filters.niche,
                  type: filters.type,
                  effort: filters.effort,
                  status: filters.status,
                  minScore: filters.minScore,
                  search: filters.search,
                  sort: filters.sort,
                } satisfies OpportunityFilters
              }
              onLoad={(f) => {
                setSearchInput(f.search);
                updateFilter({
                  niche: f.niche,
                  type: f.type,
                  effort: f.effort,
                  status: f.status,
                  minScore: f.minScore,
                  search: f.search,
                  sort: f.sort,
                });
              }}
            />
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or summary…"
              className="h-9 max-w-md border-slate-800 bg-slate-950"
            />
            <select
              value={filters.sort}
              onChange={(e) => updateFilter({ sort: e.target.value as Filters["sort"] })}
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
                value={filters.minScore}
                onChange={(e) => updateFilter({ minScore: Number(e.target.value) })}
                className="w-32"
              />
              <span className="w-6 font-mono text-slate-300">{filters.minScore}</span>
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
              value={filters.niche}
              onChange={(v) => updateFilter({ niche: v })}
              emptyLabel="All niches"
            />
            <FilterChips
              options={OPPORTUNITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={filters.type}
              onChange={(v) => updateFilter({ type: v })}
              emptyLabel="All types"
            />
            <FilterChips
              options={BUILD_EFFORTS.map((b) => ({ value: b.value, label: b.label }))}
              value={filters.effort}
              onChange={(v) => updateFilter({ effort: v })}
              emptyLabel="Any effort"
            />
            <FilterChips
              options={PRODUCT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              value={filters.status}
              onChange={(v) => updateFilter({ status: v })}
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

      <div
        className={`grid gap-3 md:grid-cols-2 xl:grid-cols-3 ${
          isPending ? "opacity-60 transition-opacity" : ""
        }`}
      >
        {opportunities.map((o) => {
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
        {opportunities.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-800 p-12 text-center">
            <p className="text-sm text-slate-400">No opportunities match your filters.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear filters
              </Button>
              <OpportunityCreateDialog
                trigger={<Button size="sm">Add manually</Button>}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}