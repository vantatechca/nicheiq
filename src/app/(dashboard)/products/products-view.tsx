"use client";

// Client view for /products. Receives filtered products from server. Updates
// URL params on filter changes; debounces search input locally.

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { NICHE_LIST, SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { formatUsd, formatNumber, formatRange } from "@/lib/utils/format";
import { FileDown, Rocket, Star, Users } from "lucide-react";
import type { Product } from "@/lib/types";

type ViewMode = "mine" | "market" | "all";

interface Filters {
  niche: string | null;
  platform: string | null;
  search: string;
  maxPrice: number;
  view: ViewMode;
}

interface Counts {
  all: number;
  mine: number;
  market: number;
}

interface Props {
  products: Product[];
  total: number;
  counts: Counts;
  filters: Filters;
}

export function ProductsView({ products, total, counts, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(filters.search);

  const updateFilter = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const u = new URLSearchParams();
      if (next.niche) u.set("niche", next.niche);
      if (next.platform) u.set("platform", next.platform);
      if (next.search.trim()) u.set("q", next.search.trim());
      if (next.maxPrice !== 200) u.set("maxPrice", String(next.maxPrice));
      // Only encode non-default view in URL — keeps default URL clean.
      if (next.view !== "all") u.set("view", next.view);
      const qs = u.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, pathname, router],
  );

  useEffect(() => {
    if (searchInput === filters.search) return;
    const t = setTimeout(() => updateFilter({ search: searchInput }), 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.search, updateFilter]);

  function clearAllFilters() {
    setSearchInput("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <>
      <PageHeader
        title="Products"
        description={
          filters.view === "mine"
            ? `${products.length} of ${counts.mine} products you've launched.`
            : filters.view === "market"
              ? `${products.length} of ${counts.market} market products tracked across all sources.`
              : `${products.length} of ${total} tracked across all sources.`
        }
        actions={
          filters.view === "mine" && counts.mine > 0 ? (
            // "Export PDF" only appears in the Mine view, and only when
            // there's something to export. Opens the print-optimized
            // page in a new tab; the page auto-fires window.print() so
            // the user just confirms "Save as PDF" in the browser dialog.
            <Button asChild size="sm" variant="outline">
              <Link href="/portfolio-pdf" target="_blank" rel="noopener">
                <FileDown className="mr-1 h-4 w-4" /> Export PDF
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/*
        View toggle — sits above the filter card because it's a more
        significant axis than niche/platform. Switching views replaces
        the entire result set; filters narrow within a view.
      */}
      <div className="mb-3 flex items-center gap-2">
        <ViewTab
          active={filters.view === "all"}
          onClick={() => updateFilter({ view: "all" })}
          label="All"
          count={counts.all}
        />
        <ViewTab
          active={filters.view === "mine"}
          onClick={() => updateFilter({ view: "mine" })}
          label="Mine"
          count={counts.mine}
          icon={<Rocket className="h-3.5 w-3.5" />}
          accent="emerald"
        />
        <ViewTab
          active={filters.view === "market"}
          onClick={() => updateFilter({ view: "market" })}
          label="Market"
          count={counts.market}
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </div>

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search titles…"
              className="h-9 max-w-md border-slate-800 bg-slate-950"
            />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              Max price
              <input
                type="range"
                min={5}
                max={300}
                value={filters.maxPrice}
                onChange={(e) => updateFilter({ maxPrice: Number(e.target.value) })}
                className="w-32"
              />
              <span className="font-mono text-slate-300">{formatUsd(filters.maxPrice)}</span>
            </div>
          </div>
          <FilterChips
            options={NICHE_LIST.map((n) => ({ value: n.value, label: n.label }))}
            value={filters.niche}
            onChange={(v) => updateFilter({ niche: v })}
            emptyLabel="All niches"
          />
          <FilterChips
            options={SOURCE_PLATFORMS.filter((p) => p.category === "marketplace").map((p) => ({
              value: p.value,
              label: p.label,
            }))}
            value={filters.platform}
            onChange={(v) => updateFilter({ platform: v })}
            emptyLabel="All platforms"
          />
        </CardContent>
      </Card>

      <div
        className={`grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
          isPending ? "opacity-60 transition-opacity" : ""
        }`}
      >
        {products.map((p) => {
          // A "launched" product carries an opportunityId tying it back
          // to the planning artefact. Show an emerald badge so the user
          // can spot their own portfolio items even when the All view
          // mixes them with market inventory. In the dedicated Mine
          // view the badge is redundant — every row is theirs — so we
          // suppress it there.
          const isMine = p.opportunityId !== null && p.opportunityId !== undefined;
          const showMineBadge = isMine && filters.view !== "mine";
          return (
            <Link key={p.id} href={`/products/${p.id}`}>
              <Card
                className={`group h-full overflow-hidden border-slate-800 bg-slate-900/40 transition hover:border-primary/40 ${
                  isMine ? "ring-1 ring-emerald-500/30" : ""
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                  <img
                    src={p.thumbnailUrl ?? "https://picsum.photos/400/300"}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <Badge variant="info" className="absolute left-2 top-2 text-[10px]">
                    {p.sourcePlatform.replace(/_/g, " ")}
                  </Badge>
                  {showMineBadge ? (
                    <Badge
                      variant="success"
                      className="absolute right-2 top-2 flex items-center gap-1 text-[10px]"
                    >
                      <Rocket className="h-2.5 w-2.5" /> Yours
                    </Badge>
                  ) : null}
                </div>
                <CardContent className="p-3">
                  <div className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                    {p.title}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{p.creator}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">
                      {formatUsd(p.priceUsd ?? 0)}
                    </span>
                    {/*
                      Launched products often have no rating data yet —
                      hide the star row entirely instead of showing
                      "undefined · 0". Competitor products almost always
                      have ratings since they come from crawls.
                    */}
                    {p.ratingAvg != null ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {p.ratingAvg.toFixed(1)} · {formatNumber(p.ratingCount, { compact: true })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">no ratings yet</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Rev: {formatRange(p.estMonthlyRevenueLow, p.estMonthlyRevenueHigh)}/mo
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {products.length === 0 ? (
          <div className="col-span-full rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            {filters.view === "mine" ? (
              <>
                No launched products yet. Go to an opportunity and set its status to{" "}
                <span className="font-mono">Launched</span> to graduate it here.
              </>
            ) : (
              <>
                No products match.{" "}
                <Button variant="link" size="sm" onClick={clearAllFilters}>
                  Reset filters
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * One tab in the view-toggle row. Active tab gets a solid fill in the
 * accent color; inactive tabs are flat with a subtle hover. The count
 * is shown as a muted parenthetical so users see at a glance how many
 * products each view would surface.
 */
function ViewTab({
  active,
  onClick,
  label,
  count,
  icon,
  accent = "slate",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
  accent?: "emerald" | "slate";
}) {
  const activeClasses =
    accent === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-slate-600 bg-slate-800 text-slate-100";
  const inactiveClasses = "border-slate-800 bg-transparent text-slate-400 hover:text-slate-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        active ? activeClasses : inactiveClasses
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={active ? "text-current/80" : "text-slate-500"}>({count})</span>
    </button>
  );
}