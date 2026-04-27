"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Sparkline } from "@/components/shared/sparkline";
import {
  findNiche,
  mockOpportunities,
  mockProducts,
  mockCreators,
  mockTrends,
  mockSignals,
} from "@/mock/data";
import { formatUsd, formatNumber, formatPct, timeAgo } from "@/lib/utils/format";

export default function NicheDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const n = findNiche(slug);
  if (!n) return <div className="p-6 text-sm text-slate-400">Niche not found.</div>;
  const opps = mockOpportunities.filter((o) => o.niche === n.slug).slice(0, 8);
  const products = mockProducts.filter((p) => p.niche === n.slug).slice(0, 8);
  const creators = mockCreators.filter((c) => c.niches.includes(n.slug));
  const trends = mockTrends.filter((t) => t.niche === n.slug);
  const signals = mockSignals.filter((s) => s.niche === n.slug).slice(0, 6);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/niches">
          <ArrowLeft className="mr-1 h-4 w-4" /> All niches
        </Link>
      </Button>

      <PageHeader
        title={n.label}
        description={n.description}
        actions={
          <Button size="sm" asChild>
            <Link href={`/brain?mode=niche&niche=${n.slug}`}>
              <Sparkles className="mr-1 h-4 w-4" /> Niche deep-dive
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Momentum</div>
            <div className="mt-1 text-2xl font-semibold">{n.momentumScore}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Products tracked</div>
            <div className="mt-1 text-2xl font-semibold">{n.productCount}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Opportunities</div>
            <div className="mt-1 text-2xl font-semibold">{n.opportunityCount}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Creators tracked</div>
            <div className="mt-1 text-2xl font-semibold">{creators.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
          <CardHeader>
            <CardTitle>Top opportunities in {n.label}</CardTitle>
            <CardDescription>Sorted by score.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {opps.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={o.score} size="sm" />
                    <span className="text-[10px] uppercase text-slate-500">{o.opportunityType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm font-medium">{o.title}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div className="text-emerald-400">{formatUsd(o.projectedRevenueUsd, { compact: true })}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.map((t) => (
              <div key={t.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{t.keyword}</span>
                  <Badge variant="info" className="text-[10px] font-mono">
                    {t.momentumScore}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <Sparkline data={t.series} width={120} height={28} color="hsl(var(--primary))" className="text-primary" />
                  <span className={t.growthPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {formatPct(t.growthPct, { signed: true })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900">
                <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                <div className="text-xs text-slate-500">
                  {p.creator} · {formatUsd(p.priceUsd ?? 0)}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Recent signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{s.signalType.replace(/_/g, " ")}</Badge>
                  <span className="text-slate-500">{timeAgo(s.processedAt)}</span>
                </div>
                <div className="mt-1 font-medium text-slate-200">{s.title}</div>
                <div className="text-slate-500">
                  {formatNumber(s.engagement.upvotes ?? 0, { compact: true })} signals
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
