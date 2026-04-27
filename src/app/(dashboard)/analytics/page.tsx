"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { RechartsLine } from "@/components/shared/recharts-line";
import { RechartsBars } from "@/components/shared/recharts-bars";
import {
  mockOpportunities,
  mockSources,
  mockNiches,
  mockFeedbackPatterns,
  mockKpis,
} from "@/mock/data";
import { formatUsd, formatNumber } from "@/lib/utils/format";
import { SCORE_BUCKETS } from "@/lib/utils/constants";

export default function AnalyticsPage() {
  const buckets = SCORE_BUCKETS.map((b) => ({
    ...b,
    count: mockOpportunities.filter((o) => o.score >= b.min && o.score <= b.max).length,
  }));

  const sourceContribution = mockSources
    .map((s) => ({ ...s }))
    .sort((a, b) => b.itemsTracked - a.itemsTracked)
    .slice(0, 12);

  const nichePerf = [...mockNiches].sort((a, b) => b.opportunityCount - a.opportunityCount).slice(0, 12);

  return (
    <>
      <PageHeader title="Analytics" description="Score distribution, source contribution, niche performance, feedback patterns." />

      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="niches">Niches</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {buckets.map((b) => (
              <Card key={b.label} className="border-slate-800 bg-slate-900/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{b.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {b.min}–{b.max}
                    </Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{b.count}</div>
                  <Progress
                    value={(b.count / mockOpportunities.length) * 100}
                    className="mt-2 h-1.5 bg-slate-800"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-6 border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Avg score · 14d</CardTitle>
              <CardDescription>Rolling average across all active opportunities.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-3xl font-semibold">{mockKpis.avgScore}</div>
              <RechartsLine data={mockKpis.scoreSparkline} height={200} variant="area" />
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Score distribution buckets</CardTitle>
              <CardDescription>Active opportunities by score band.</CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsBars
                data={buckets.map((b) => ({ label: b.label, value: b.count }))}
                height={220}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Top 12 by items tracked</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceContribution.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm">{s.label}</span>
                  <div className="flex-1">
                    <Progress
                      value={(s.itemsTracked / sourceContribution[0]!.itemsTracked) * 100}
                      className="h-1.5 bg-slate-800"
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-xs text-slate-300">
                    {formatNumber(s.itemsTracked, { compact: true })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="niches">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Niche performance</CardTitle>
              <CardDescription>By opportunity count + projected revenue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {nichePerf.map((n) => {
                const totalRev = mockOpportunities
                  .filter((o) => o.niche === n.slug)
                  .reduce((s, o) => s + o.projectedRevenueUsd, 0);
                return (
                  <div key={n.id} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <span className="col-span-3 truncate text-slate-200">{n.label}</span>
                    <div className="col-span-6">
                      <Progress
                        value={(n.opportunityCount / Math.max(1, nichePerf[0]!.opportunityCount)) * 100}
                        className="h-1.5 bg-slate-800"
                      />
                    </div>
                    <span className="col-span-1 font-mono text-slate-400">{n.opportunityCount}</span>
                    <span className="col-span-2 text-right font-mono text-emerald-400">
                      {formatUsd(totalRev, { compact: true })}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <div className="grid gap-3 md:grid-cols-2">
            {mockFeedbackPatterns.map((p) => (
              <Card key={p.id} className="border-slate-800 bg-slate-900/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.label}</span>
                    <Badge variant="violet" className="font-mono text-[10px]">
                      {(p.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{p.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.signalKeywords.map((k) => (
                      <code key={k} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300">
                        {k}
                      </code>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
