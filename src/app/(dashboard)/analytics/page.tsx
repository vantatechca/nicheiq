"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { RechartsLine } from "@/components/shared/recharts-line";
import { RechartsBars } from "@/components/shared/recharts-bars";
import { useApi } from "@/lib/hooks/use-api";
import { formatUsd, formatNumber } from "@/lib/utils/format";

interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

interface ScoresResponse {
  avg: number;
  sparkline: { date: string; value: number }[];
  buckets: ScoreBucket[];
  total: number;
}

interface SourceRow {
  id: string;
  label: string;
  itemsTracked: number;
  signalCount: number;
}

interface SourcesResponse {
  contribution: SourceRow[];
}

interface NicheRow {
  id: string;
  slug: string;
  label: string;
  opportunityCount: number;
  totalProjectedRevenue: number;
}

interface NichesResponse {
  niches: NicheRow[];
}

interface FeedbackPattern {
  id: string;
  label: string;
  description: string;
  confidence: number;
  signalKeywords: string[];
}

interface PatternsResponse {
  patterns: FeedbackPattern[];
}

export default function AnalyticsPage() {
  const {
    data: scoresData,
    loading: scoresLoading,
    error: scoresError,
  } = useApi<ScoresResponse>("/api/analytics/scores");
  const {
    data: sourcesData,
    loading: sourcesLoading,
    error: sourcesError,
  } = useApi<SourcesResponse>("/api/analytics/sources");
  const {
    data: nichesData,
    loading: nichesLoading,
    error: nichesError,
  } = useApi<NichesResponse>("/api/analytics/niches");
  const {
    data: patternsData,
    loading: patternsLoading,
    error: patternsError,
  } = useApi<PatternsResponse>("/api/analytics/patterns");

  const buckets = scoresData?.buckets ?? [];
  const total = scoresData?.total ?? 0;
  const avg = scoresData?.avg ?? 0;
  const sparkline = scoresData?.sparkline ?? [];

  // NOTE: the endpoint returns { contribution }, not { sources }.
  const sourceContribution = (sourcesData?.contribution ?? []).slice(0, 12);
  const topSourceItems = sourceContribution[0]?.itemsTracked ?? 1;

  const nichePerf = (nichesData?.niches ?? []).slice(0, 12);
  const topNicheCount = nichePerf[0]?.opportunityCount ?? 1;

  const patterns = patternsData?.patterns ?? [];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Score distribution, source contribution, niche performance, feedback patterns."
      />

      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="niches">Niches</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          {scoresError ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn&apos;t load scores: {scoresError.message} ({scoresError.status || "network"}).
            </div>
          ) : null}
          {scoresLoading && buckets.length === 0 ? (
            <div className="text-xs text-slate-500">Loading scores…</div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {buckets.map((b) => (
              <Card key={b.label} className="border-slate-800 bg-slate-900/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{b.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {b.min}–{b.max}
                    </Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{b.count}</div>
                  <Progress
                    value={total > 0 ? (b.count / total) * 100 : 0}
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
              <div className="mb-2 text-3xl font-semibold">{avg}</div>
              {sparkline.length >= 2 ? (
                <RechartsLine data={sparkline} height={200} variant="area" />
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-slate-800 text-xs text-slate-500">
                  Not enough data points for a 14-day chart yet.
                </div>
              )}
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
          {sourcesError ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn&apos;t load sources: {sourcesError.message} ({sourcesError.status || "network"}
              ).
            </div>
          ) : null}
          {sourcesLoading && sourceContribution.length === 0 ? (
            <div className="text-xs text-slate-500">Loading sources…</div>
          ) : null}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Top 12 by items tracked</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceContribution.length === 0 && !sourcesLoading ? (
                <div className="text-xs text-slate-500">No source data yet.</div>
              ) : null}
              {sourceContribution.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm">{s.label}</span>
                  <div className="flex-1">
                    <Progress
                      value={(s.itemsTracked / topSourceItems) * 100}
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
          {nichesError ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn&apos;t load niches: {nichesError.message} ({nichesError.status || "network"}).
            </div>
          ) : null}
          {nichesLoading && nichePerf.length === 0 ? (
            <div className="text-xs text-slate-500">Loading niches…</div>
          ) : null}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Niche performance</CardTitle>
              <CardDescription>By opportunity count + projected revenue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {nichePerf.length === 0 && !nichesLoading ? (
                <div className="text-xs text-slate-500">No niche data yet.</div>
              ) : null}
              {nichePerf.map((n) => (
                <div key={n.id} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <span className="col-span-3 truncate text-slate-200">{n.label}</span>
                  <div className="col-span-6">
                    <Progress
                      value={(n.opportunityCount / Math.max(1, topNicheCount)) * 100}
                      className="h-1.5 bg-slate-800"
                    />
                  </div>
                  <span className="col-span-1 font-mono text-slate-400">{n.opportunityCount}</span>
                  <span className="col-span-2 text-right font-mono text-emerald-400">
                    {formatUsd(n.totalProjectedRevenue, { compact: true })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          {patternsError ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn&apos;t load patterns: {patternsError.message} (
              {patternsError.status || "network"}).
            </div>
          ) : null}
          {patternsLoading && patterns.length === 0 ? (
            <div className="text-xs text-slate-500">Loading patterns…</div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {patterns.length === 0 && !patternsLoading ? (
              <div className="text-xs text-slate-500 md:col-span-2">No patterns yet.</div>
            ) : null}
            {patterns.map((p) => (
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
                      <code
                        key={k}
                        className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300"
                      >
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
