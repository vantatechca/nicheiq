"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { mockResellable } from "@/mock/data";
import { formatUsd, timeAgo } from "@/lib/utils/format";
import { RESELLABLE_STATUSES } from "@/lib/utils/constants";

export default function ResellablePage() {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? mockResellable : mockResellable.filter((r) => r.status === tab);

  return (
    <>
      <PageHeader
        title="Resellable assets"
        description={`${mockResellable.length} datasets, PLR packs, expired Etsy & Flippa listings.`}
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Track new asset
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({mockResellable.length})</TabsTrigger>
          {RESELLABLE_STATUSES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label} ({mockResellable.filter((r) => r.status === s.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {a.assetType.replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    variant={
                      a.status === "acquired"
                        ? "success"
                        : a.status === "negotiating"
                        ? "warning"
                        : a.status === "passed"
                        ? "destructive"
                        : a.status === "reviewing"
                        ? "info"
                        : "outline"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                <h3 className="mt-2 text-sm font-medium">{a.title}</h3>
                <div className="mt-2 grid gap-1 text-xs">
                  <Row label="Asking" value={a.askingPriceUsd ? formatUsd(a.askingPriceUsd) : "—"} />
                  <Row label="Monthly rev" value={a.monthlyRevenueUsd ? formatUsd(a.monthlyRevenueUsd) : "—"} />
                  <Row label="License" value={a.license ?? "—"} />
                  <Row label="Niche" value={a.niche ? a.niche.replace(/_/g, " ") : "—"} />
                  <Row label="Source" value={a.sourcePlatform.replace(/_/g, " ")} />
                  <Row label="Found" value={timeAgo(a.createdAt)} />
                </div>
                {a.notes ? (
                  <p className="mt-2 line-clamp-2 text-[11px] text-slate-400">{a.notes}</p>
                ) : null}
                {a.assetType === "plr_pack" && a.license ? (
                  <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">
                    PLR license: {a.license}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                      Source <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/brain?mode=dataset_review&id=${a.id}`}>Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}
