"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { RechartsLine } from "@/components/shared/recharts-line";
import { ScoreBadge } from "@/components/shared/score-badge";
import {
  mockTrends,
  mockOpportunities,
  mockSignals,
  mockProducts,
} from "@/mock/data";
import { formatNumber, formatPct, timeAgo, formatUsd } from "@/lib/utils/format";

export default function TrendDetailPage() {
  const { keyword } = useParams<{ keyword: string }>();
  const decoded = decodeURIComponent(keyword);
  const trend = mockTrends.find((t) => t.keyword === decoded);

  if (!trend) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/trends">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to trends
          </Link>
        </Button>
        <div className="rounded-md border border-dashed border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-400">No trend found for "{decoded}".</p>
        </div>
      </div>
    );
  }

  const linkedOpps = mockOpportunities
    .filter((o) => o.niche === trend.niche || o.title.toLowerCase().includes(decoded.toLowerCase()))
    .slice(0, 6);
  const linkedSignals = mockSignals
    .filter((s) => s.niche === trend.niche || s.title.toLowerCase().includes(decoded.toLowerCase()))
    .slice(0, 8);
  const linkedProducts = mockProducts
    .filter((p) => p.niche === trend.niche || p.title.toLowerCase().includes(decoded.toLowerCase()))
    .slice(0, 6);

  const peak = Math.max(...trend.series.map((s) => s.value));
  const trough = Math.min(...trend.series.map((s) => s.value));

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/trends">
          <ArrowLeft className="mr-1 h-4 w-4" /> All trends
        </Link>
      </Button>

      <PageHeader
        title={trend.keyword}
        description={
          <span className="flex items-center gap-2">
            <Badge variant="outline">{trend.niche.replace(/_/g, " ")}</Badge>
            <Badge variant="outline">{trend.geo}</Badge>
            <span>·</span>
            <span className={trend.growthPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {formatPct(trend.growthPct, { signed: true })} w/w
            </span>
          </span>
        }
        actions={
          <Button size="sm" asChild>
            <Link href={`/brain?mode=global&trend=${encodeURIComponent(trend.keyword)}`}>
              <Sparkles className="mr-1 h-4 w-4" /> Ask Brain
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Momentum</div>
            <div className="mt-1 text-2xl font-semibold">{trend.momentumScore}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">7d volume</div>
            <div className="mt-1 text-2xl font-semibold">{formatNumber(trend.volume7d, { compact: true })}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">30d volume</div>
            <div className="mt-1 text-2xl font-semibold">{formatNumber(trend.volume30d, { compact: true })}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-slate-500">Peak / trough</div>
            <div className="mt-1 text-sm font-semibold">
              {formatNumber(peak, { compact: true })} <span className="text-slate-500">/</span>{" "}
              {formatNumber(trough, { compact: true })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle>30-day series</CardTitle>
          <CardDescription>Daily search/mention volume.</CardDescription>
        </CardHeader>
        <CardContent>
          <RechartsLine
            data={trend.series}
            height={280}
            variant="area"
            color={trend.growthPct >= 0 ? "rgb(52,211,153)" : "rgb(244,63,94)"}
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
          <CardHeader>
            <CardTitle>Linked opportunities</CardTitle>
            <CardDescription>Bets that ride this trend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedOpps.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                No opportunities yet — synthesize one in the Brain.
              </div>
            ) : null}
            {linkedOpps.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={o.score} size="sm" />
                    <span className="text-[10px] uppercase text-slate-500">
                      {o.opportunityType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm font-medium">{o.title}</div>
                  <div className="line-clamp-1 text-xs text-slate-500">{o.summary}</div>
                </div>
                <span className="text-xs text-emerald-400">
                  {formatUsd(o.projectedRevenueUsd, { compact: true })}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Source signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedSignals.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                Nothing yet.
              </div>
            ) : null}
            {linkedSignals.map((s) => (
              <a
                key={s.id}
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-slate-800 bg-slate-950/40 p-2 text-xs hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {s.signalType.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-slate-500">{timeAgo(s.processedAt)}</span>
                </div>
                <div className="mt-1 line-clamp-1 font-medium text-slate-200">{s.title}</div>
                <div className="text-[10px] text-sky-400">
                  source <ExternalLink className="ml-0.5 inline h-2 w-2" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {linkedProducts.length > 0 ? (
        <Card className="mt-6 border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Top products in this niche</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {linkedProducts.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
              >
                <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                <div className="text-xs text-slate-500">
                  {p.creator} · {formatUsd(p.priceUsd ?? 0)}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
