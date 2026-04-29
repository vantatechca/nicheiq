"use client";

// Client view for /creators. Receives sorted/filtered creators from server.
// Search input is debounced locally; platform chip updates URL immediately.

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { formatNumber, formatUsd } from "@/lib/utils/format";
import type { Creator } from "@/lib/types";

interface Filters {
  search: string;
  platform: string | null;
}

interface Props {
  creators: Creator[];
  total: number;
  filters: Filters;
}

export function CreatorsView({ creators, total, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(filters.search);

  const updateFilter = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const u = new URLSearchParams();
      if (next.platform) u.set("platform", next.platform);
      if (next.search.trim()) u.set("q", next.search.trim());
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

  return (
    <>
      <PageHeader
        title="Creators"
        description={`${creators.length} of ${total} creators by est. monthly revenue.`}
      />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="space-y-3 p-4">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or handle…"
            className="h-9 max-w-md border-slate-800 bg-slate-950"
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

      <Card className={`border-slate-800 bg-slate-900/40 ${isPending ? "opacity-60 transition-opacity" : ""}`}>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Click to open the playbook.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {creators.map((c, i) => (
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
                  <div className="font-semibold text-emerald-400">
                    {formatUsd(c.totalEstRevenueUsd, { compact: true })}
                  </div>
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
                  <Badge variant="info" className="text-[10px]">
                    {c.productCount} SKUs
                  </Badge>
                </div>
              </Link>
            ))}
            {creators.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                No creators match your filters.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}