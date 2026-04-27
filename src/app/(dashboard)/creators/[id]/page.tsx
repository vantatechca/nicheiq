"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { findCreator, mockProducts } from "@/mock/data";
import { formatUsd, formatNumber, timeAgo } from "@/lib/utils/format";

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const c = findCreator(id);
  if (!c) return <div className="p-6 text-sm text-slate-400">Creator not found.</div>;
  const products = mockProducts.filter((p) => p.creatorId === c.id);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/creators">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <img src={c.avatarUrl} alt="" className="h-16 w-16 rounded-full" />
          <div>
            <div className="text-2xl font-semibold tracking-tight">{c.displayName}</div>
            <div className="text-sm text-slate-400">
              {c.handle} · {c.sourcePlatform.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={c.profileUrl} target="_blank" rel="noreferrer">
              Profile <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/brain?mode=creator&id=${c.id}`}>
              <Sparkles className="mr-1 h-4 w-4" /> Reverse-engineer
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Playbook</CardTitle>
              <CardDescription>What's working — pricing, cadence, funnels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-400">Pricing tiers</div>
                <div className="mt-1 grid gap-2 sm:grid-cols-3">
                  {c.playbook?.pricingTiers.map((t) => (
                    <div key={t.label} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-center">
                      <div className="text-[10px] uppercase text-slate-500">{t.label}</div>
                      <div className="mt-0.5 text-base font-semibold">{formatUsd(t.priceUsd)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Posting cadence</div>
                <div className="text-sm text-slate-200">{c.playbook?.postingCadence}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Top tags</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.playbook?.topTags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Funnels</div>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                  {c.playbook?.funnels.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Signature style</div>
                <div className="text-sm text-slate-200">{c.playbook?.signatureStyle}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
                >
                  <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-slate-500">
                    {formatUsd(p.priceUsd ?? 0)} · {p.niche.replace(/_/g, " ")}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Followers" value={formatNumber(c.followerCount, { compact: true })} />
              <Row label="Products" value={String(c.productCount)} />
              <Row label="Est. revenue" value={formatUsd(c.totalEstRevenueUsd, { compact: true })} />
              <Row label="Niches" value={c.niches.map((n) => n.replace(/_/g, " ")).join(", ")} />
              <Row label="Last enriched" value={timeAgo(c.lastEnrichedAt)} />
            </CardContent>
          </Card>
          {c.notes ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-sm text-amber-200">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-100">{c.notes}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
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
