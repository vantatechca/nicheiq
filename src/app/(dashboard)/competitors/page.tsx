"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shared/page-header";
import { mockCompetitors, mockCreators } from "@/mock/data";
import { formatUsd, formatNumber, timeAgo } from "@/lib/utils/format";

export default function CompetitorsPage() {
  const [open, setOpen] = useState<string | null>(mockCompetitors[0]?.id ?? null);
  return (
    <>
      <PageHeader title="Competitors" description={`Curated deep-dive list — ${mockCompetitors.length} creators.`} />

      <div className="space-y-3">
        {mockCompetitors.map((c) => {
          const creator = mockCreators.find((x) => x.id === c.creatorId);
          if (!creator) return null;
          const expanded = open === c.id;
          return (
            <Card key={c.id} className="border-slate-800 bg-slate-900/40">
              <Collapsible open={expanded} onOpenChange={(v) => setOpen(v ? c.id : null)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={creator.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                        <div>
                          <CardTitle className="text-base">{creator.displayName}</CardTitle>
                          <CardDescription>{creator.handle} · {creator.sourcePlatform.replace(/_/g, " ")}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.depth === "deep" ? "info" : "outline"}>
                          {c.depth}
                        </Badge>
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
                      <Stat label="Followers" value={formatNumber(creator.followerCount, { compact: true })} />
                      <Stat label="Est. revenue" value={formatUsd(creator.totalEstRevenueUsd, { compact: true })} />
                      <Stat label="Reviewed" value={timeAgo(c.lastReviewedAt)} />
                    </div>

                    <div>
                      <div className="text-xs uppercase text-slate-400">Notes</div>
                      <div className="text-sm text-slate-300">{c.notes}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase text-slate-400">Pricing tiers</div>
                      <div className="mt-1 grid gap-2 sm:grid-cols-3">
                        {c.playbook.pricingTiers.map((t) => (
                          <div key={t.label} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                            <div className="text-[10px] uppercase text-slate-500">{t.label}</div>
                            <div className="text-sm font-semibold">{formatUsd(t.priceUsd)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={creator.profileUrl} target="_blank" rel="noreferrer">
                          Profile <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
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
