"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shared/page-header";
import { useApi } from "@/lib/hooks/use-api";
import { formatUsd, formatNumber, timeAgo } from "@/lib/utils/format";

interface PricingTier {
  label: string;
  priceUsd: number;
}

interface CompetitorPlaybook {
  pricingTiers: PricingTier[];
}

interface Competitor {
  id: string;
  creatorId: string;
  depth: "shallow" | "deep";
  notes: string;
  playbook: CompetitorPlaybook;
  lastReviewedAt: string;
}

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  sourcePlatform: string;
  followerCount: number | null;
  totalEstRevenueUsd: number;
}

export default function CompetitorsPage() {
  const { data: competitorsData, loading: cLoading } = useApi<{ competitors: Competitor[] }>(
    "/api/competitors",
  );
  const { data: creatorsData, loading: crLoading } = useApi<{ creators: Creator[] }>(
    "/api/creators?limit=200",
  );

  const competitors = competitorsData?.competitors ?? [];
  const creators = creatorsData?.creators ?? [];

  // Build creator map once for O(1) lookup.
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  const [open, setOpen] = useState<string | null>(null);

  // When competitors load, default-expand the first one (preserves original
  // page behavior).
  const defaultOpen = open ?? competitors[0]?.id ?? null;

  const loading = cLoading || crLoading;

  return (
    <>
      <PageHeader
        title="Competitors"
        description={`Curated deep-dive list — ${competitors.length} creators.`}
      />

      {loading && competitors.length === 0 ? (
        <div className="text-xs text-slate-500">Loading competitors…</div>
      ) : null}

      {!loading && competitors.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          No competitors tracked yet. Add one from any creator&apos;s playbook page.
        </div>
      ) : null}

      <div className="space-y-3">
        {competitors.map((c) => {
          const creator = creatorMap.get(c.creatorId);
          if (!creator) return null;
          const expanded = defaultOpen === c.id;
          return (
            <Card key={c.id} className="border-slate-800 bg-slate-900/40">
              <Collapsible open={expanded} onOpenChange={(v) => setOpen(v ? c.id : null)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {creator.avatarUrl ? (
                          <img src={creator.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-800" />
                        )}
                        <div>
                          <CardTitle className="text-base">{creator.displayName}</CardTitle>
                          <CardDescription>
                            {creator.handle} · {creator.sourcePlatform.replace(/_/g, " ")}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.depth === "deep" ? "info" : "outline"}>{c.depth}</Badge>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0 text-sm">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Stat
                        label="Followers"
                        value={formatNumber(creator.followerCount ?? 0, { compact: true })}
                      />
                      <Stat
                        label="Est. revenue"
                        value={formatUsd(creator.totalEstRevenueUsd, { compact: true })}
                      />
                      <Stat
                        label="Reviewed"
                        value={c.lastReviewedAt ? timeAgo(c.lastReviewedAt) : "—"}
                      />
                    </div>

                    {c.notes ? (
                      <div>
                        <div className="text-xs uppercase text-slate-400">Notes</div>
                        <div className="text-sm text-slate-300">{c.notes}</div>
                      </div>
                    ) : null}

                    {c.playbook?.pricingTiers && c.playbook.pricingTiers.length > 0 ? (
                      <div>
                        <div className="text-xs uppercase text-slate-400">Pricing tiers</div>
                        <div className="mt-1 grid gap-2 sm:grid-cols-3">
                          {c.playbook.pricingTiers.map((t) => (
                            <div
                              key={t.label}
                              className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center"
                            >
                              <div className="text-[10px] uppercase text-slate-500">{t.label}</div>
                              <div className="text-sm font-semibold">{formatUsd(t.priceUsd)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      {creator.profileUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={creator.profileUrl} target="_blank" rel="noreferrer">
                            Profile <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild size="sm">
                        <Link href={`/creators/${creator.id}`}>Open playbook →</Link>
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
