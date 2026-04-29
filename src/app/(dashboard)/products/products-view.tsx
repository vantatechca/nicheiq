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
import { Star } from "lucide-react";
import type { Product } from "@/lib/types";

interface Filters {
  niche: string | null;
  platform: string | null;
  search: string;
  maxPrice: number;
}

interface Props {
  products: Product[];
  total: number;
  filters: Filters;
}

export function ProductsView({ products, total, filters }: Props) {
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
        description={`${products.length} of ${total} tracked across all sources.`}
      />

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
        {products.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`}>
            <Card className="group h-full overflow-hidden border-slate-800 bg-slate-900/40 transition hover:border-primary/40">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                <img
                  src={p.thumbnailUrl ?? "https://picsum.photos/400/300"}
                  alt={p.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <Badge variant="info" className="absolute left-2 top-2 text-[10px]">
                  {p.sourcePlatform.replace(/_/g, " ")}
                </Badge>
              </div>
              <CardContent className="p-3">
                <div className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                  {p.title}
                </div>
                <div className="mt-1 line-clamp-1 text-xs text-slate-500">{p.creator}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400">{formatUsd(p.priceUsd ?? 0)}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {p.ratingAvg?.toFixed(1)} · {formatNumber(p.ratingCount, { compact: true })}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Rev: {formatRange(p.estMonthlyRevenueLow, p.estMonthlyRevenueHigh)}/mo
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {products.length === 0 ? (
          <div className="col-span-full rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No products match.{" "}
            <Button variant="link" size="sm" onClick={clearAllFilters}>
              Reset filters
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}