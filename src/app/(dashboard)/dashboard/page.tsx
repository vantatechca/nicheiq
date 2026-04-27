import Link from "next/link";
import { Activity, Lightbulb, Sparkles, TrendingUp, Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Sparkline } from "@/components/shared/sparkline";
import {
  mockKpis,
  mockOpportunities,
  mockTrends,
  mockNiches,
  mockActivity,
  mockSignals,
} from "@/mock/data";
import { formatUsd, formatPct, timeAgo, formatNumber } from "@/lib/utils/format";
import { ACTIVITY_ICONS } from "@/lib/utils/constants";

export const metadata = { title: "Dashboard · NicheIQ" };

export default function DashboardPage() {
  const topOpps = mockOpportunities.slice(0, 5);
  const risingNiches = [...mockNiches].sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 6);
  const risingTrends = [...mockTrends].sort((a, b) => b.growthPct - a.growthPct).slice(0, 4);
  const recentActivity = mockActivity.slice(0, 8);
  const liveSignals = mockSignals.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live signals from 38 sources, scored and filtered by your golden rules."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/digest">Today's digest</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/brain">
                <Sparkles className="mr-1 h-4 w-4" /> Ask Brain
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="New opps · 24h"
          value={String(mockKpis.newOpportunities24h)}
          icon={Lightbulb}
          tone="info"
          hint="vs. baseline"
        />
        <KpiCard
          label="Trending niches"
          value={String(mockKpis.trendingNiches)}
          icon={TrendingUp}
          tone="positive"
          hint=">15% w/w"
        />
        <KpiCard
          label="Active builds"
          value={String(mockKpis.activeBuilds)}
          icon={Workflow}
          tone="default"
        />
        <KpiCard
          label="Projected revenue"
          value={formatUsd(mockKpis.totalProjectedRevenue, { compact: true })}
          icon={Activity}
          tone="positive"
          hint="building + shortlisted"
        />
        <KpiCard
          label="Avg score"
          value={String(mockKpis.avgScore)}
          icon={Sparkles}
          tone="info"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top opportunities today</CardTitle>
              <CardDescription>Highest scoring across all niches.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/opportunities">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topOpps.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="block rounded-md border border-slate-800 bg-slate-950/40 p-3 transition-colors hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={o.score} />
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {o.opportunityType.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {o.buildEffort.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <h3 className="mt-1.5 truncate text-sm font-medium">{o.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{o.summary}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div className="font-semibold text-emerald-400">{formatUsd(o.projectedRevenueUsd, { compact: true })}</div>
                    <div className="text-[10px] text-slate-500">projected</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>14-day rolling average.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-semibold">{mockKpis.avgScore}</div>
              <div className="text-xs text-slate-400">avg</div>
            </div>
            <Sparkline
              data={mockKpis.scoreSparkline}
              width={280}
              height={64}
              color="hsl(var(--primary))"
              className="mt-3 text-primary"
            />
            <Separator className="my-4 bg-slate-800" />
            <div className="space-y-2">
              {risingTrends.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-300">{t.keyword}</span>
                  <span className={t.growthPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {formatPct(t.growthPct, { signed: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Rising niches</CardTitle>
            <CardDescription>Momentum score 0–100.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {risingNiches.map((n) => (
              <Link
                key={n.id}
                href={`/niches/${n.slug}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-900"
              >
                <span className="truncate">{n.label}</span>
                <Badge variant="info" className="text-[10px]">
                  {n.momentumScore}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live feed</CardTitle>
              <CardDescription>Latest 5 signals across sources.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/feed">All →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveSignals.map((s) => (
              <div key={s.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {s.signalType.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-slate-500">{timeAgo(s.processedAt)}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-sm text-slate-200">{s.title}</div>
                <div className="line-clamp-1 text-[11px] text-slate-500">{s.snippet}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>What you and your team did.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {recentActivity.map((a) => {
                const Icon = ACTIVITY_ICONS[a.action] ?? ACTIVITY_ICONS.default!;
                return (
                  <li key={a.id} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-300">
                        <span className="font-medium">{a.userName}</span> {a.action.replace(/_/g, " ")} ·{" "}
                        <span className="text-slate-500">{a.entityType}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{timeAgo(a.createdAt)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle>Source contribution</CardTitle>
          <CardDescription>Tracked items per source over the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {mockTrends.slice(0, 16).map((t) => (
              <div key={t.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                <div className="text-[10px] uppercase text-slate-500">{t.geo}</div>
                <div className="truncate text-xs text-slate-300">{t.keyword}</div>
                <div className="text-sm font-semibold">{formatNumber(t.volume7d, { compact: true })}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
