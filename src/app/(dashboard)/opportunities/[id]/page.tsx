"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Printer,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScoreBadge } from "@/components/shared/score-badge";
import { ScoreBar } from "@/components/shared/score-bar";
import { PageHeader } from "@/components/shared/page-header";
import { AnnotationsThread } from "@/components/opportunity/annotations";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { formatUsd, timeAgo } from "@/lib/utils/format";

interface Opportunity {
  id: string;
  title: string;
  summary: string;
  niche: string;
  opportunityType: string;
  buildEffort: string;
  status: string;
  projectedRevenueUsd: number;
  score: number;
  scoreBreakdown: unknown;
  aiRationale: string;
  aiBuildPlan: unknown;
  sourceProductIds: string[];
  sourceSignalIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  title: string;
  creator: string | null;
  sourcePlatform: string;
  priceUsd: number | null;
}

interface Signal {
  id: string;
  title: string;
  snippet: string;
  signalType: string;
  sourceUrl: string;
  processedAt: string;
}

// ── Normalizers (outside component) ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBreakdown(raw: unknown): any {
  if (raw && typeof raw === "object" && "dimensions" in raw && "ruleModifiers" in raw) {
    return raw;
  }
  const flat = (raw ?? {}) as Record<string, number>;

  // Map AI keys → SCORE_DIMENSIONS keys (demand, competition, revenue, buildEffort, trend)
  const keyMap: Record<string, string> = {
    demandSignal: "demand",
    demand: "demand",
    competition: "competition",
    competitionLevel: "competition",
    monetisation: "revenue",
    monetization: "revenue",
    revenue: "revenue",
    timeToMarket: "buildEffort",
    buildEffort: "buildEffort",
    creatorFit: "trend",
    trend: "trend",
  };

  const dimensions: Record<string, { value: number; rationale?: string }> = {
    demand: { value: 0 },
    competition: { value: 0 },
    revenue: { value: 0 },
    buildEffort: { value: 0 },
    trend: { value: 0 },
  };

  for (const [k, v] of Object.entries(flat)) {
    const mapped = keyMap[k];
    if (mapped) dimensions[mapped] = { value: Number(v) };
  }

  return { dimensions, ruleModifiers: [], patternModifiers: [] };
}

function normalizeBuildPlan(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    weeks: Array.isArray(p.weeks)
      ? (p.weeks as { label: string; deliverables: string[] }[])
      : Object.entries(p)
          .filter(([k]) => k.startsWith("phase"))
          .map(([label, deliverables]) => ({
            label,
            deliverables:
              typeof deliverables === "string"
                ? [deliverables]
                : Array.isArray(deliverables)
                  ? (deliverables as string[])
                  : [],
          })),
    stack: Array.isArray(p.stack)
      ? (p.stack as string[])
      : Array.isArray(p.tools)
        ? (p.tools as string[])
        : [],
    monetization: Array.isArray(p.monetization)
      ? (p.monetization as string[])
      : typeof p.monetisation === "string"
        ? [p.monetisation]
        : [],
    risks: Array.isArray(p.risks) ? (p.risks as string[]) : [],
    successMetrics: Array.isArray(p.successMetrics) ? (p.successMetrics as string[]) : [],
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: oppData, loading } = useApi<{ opportunity: Opportunity }>(
    id ? `/api/opportunities/${id}` : null,
  );
  const opp = oppData?.opportunity ?? null;

  const { data: similarData } = useApi<{ opportunities: Opportunity[] }>(
    opp ? `/api/opportunities?niche=${opp.niche}&limit=5` : null,
  );
  const similar = (similarData?.opportunities ?? []).filter((o) => o.id !== opp?.id).slice(0, 4);

  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [voting, setVoting] = useState<"up" | "down" | null>(null);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading opportunity…</div>;
  if (!opp) return <div className="p-6 text-sm text-slate-400">Opportunity not found.</div>;

  const buildPlan = normalizeBuildPlan(opp.aiBuildPlan);

  async function castVote(direction: "up" | "down") {
    if (voting || !opp) return;
    setVoting(direction);
    try {
      const json = await api.post<{ vote: string; votes: { up: number; down: number } }>(
        `/api/opportunities/${opp.id}/vote`,
        { direction },
      );
      if (json?.votes) setVotes(json.votes);
      toast.success(direction === "up" ? "Upvoted" : "Downvoted");
    } catch (err) {
      toast.error((err as Error).message || "Vote failed");
    } finally {
      setVoting(null);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/opportunities">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to opportunities
        </Link>
      </Button>

      <PageHeader
        title={opp.title}
        description={opp.summary}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="print:hidden"
            >
              <Printer className="mr-1 h-4 w-4" /> Print one-pager
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              onClick={async () => {
                const res = await fetch(`/api/opportunities/${opp.id}/score`, { method: "POST" });
                if (res.ok) {
                  toast.success("Rescored — refreshing…");
                  setTimeout(() => window.location.reload(), 1000);
                } else {
                  toast.error("Rescore failed");
                }
              }}
            >
              Rescore
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              disabled={voting !== null}
              onClick={() => castVote("up")}
            >
              <ThumbsUp className="mr-1 h-4 w-4" /> {votes.up}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              disabled={voting !== null}
              onClick={() => castVote("down")}
            >
              <ThumbsDown className="mr-1 h-4 w-4" /> {votes.down}
            </Button>
            <Button size="sm" asChild className="print:hidden">
              <Link href={`/brain?mode=opportunity&id=${opp.id}`}>
                <Sparkles className="mr-1 h-4 w-4" /> Ask Brain
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <ScoreBadge score={opp.score} size="lg" />
        <Badge variant="outline">{opp.niche.replace(/_/g, " ")}</Badge>
        <Badge variant="outline">{opp.opportunityType.replace(/_/g, " ")}</Badge>
        <Badge variant="outline">
          <Workflow className="mr-1 h-3 w-3" /> {opp.buildEffort.replace(/_/g, " ")}
        </Badge>
        <Badge variant="info">{opp.status}</Badge>
        <Badge variant="success" className="font-mono">
          proj. {formatUsd(opp.projectedRevenueUsd, { compact: true })}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>AI rationale</CardTitle>
              <CardDescription>Why this opportunity surfaced.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-300">{opp.aiRationale}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Build plan</CardTitle>
              <CardDescription>
                Generated by Claude · {opp.buildEffort.replace(/_/g, " ")} cadence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mb-2 gap-1">
                    Phases <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
                  {buildPlan.weeks.length === 0 && (
                    <div className="text-xs text-slate-500">No phases generated.</div>
                  )}
                  {buildPlan.weeks.map((w) => (
                    <div
                      key={w.label}
                      className="rounded-md border border-slate-800 bg-slate-950/40 p-3"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        {w.label}
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {w.deliverables.map((d) => (
                          <li key={d} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Stack</div>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {buildPlan.stack.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Monetization</div>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-300">
                    {buildPlan.monetization.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Risks</div>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-300">
                    {buildPlan.risks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    Success metrics
                  </div>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-300">
                    {buildPlan.successMetrics.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="signals">
            <TabsList>
              <TabsTrigger value="signals">Source signals</TabsTrigger>
              <TabsTrigger value="products">Source products</TabsTrigger>
              <TabsTrigger value="similar">Similar opps</TabsTrigger>
              <TabsTrigger value="annotations">Annotations</TabsTrigger>
            </TabsList>
            <TabsContent value="signals">
              <SourceSignalsTab signalIds={opp.sourceSignalIds} />
            </TabsContent>
            <TabsContent value="products">
              <SourceProductsTab productIds={opp.sourceProductIds} />
            </TabsContent>
            <TabsContent value="similar">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardContent className="grid gap-2 p-3 md:grid-cols-2">
                  {similar.map((o) => (
                    <Link
                      key={o.id}
                      href={`/opportunities/${o.id}`}
                      className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={o.score} size="sm" />
                        <span className="line-clamp-1 text-sm font-medium">{o.title}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">{o.summary}</div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="annotations">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardContent className="p-4">
                  <AnnotationsThread opportunityId={opp.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
              <CardDescription>5-dimension heuristic + rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreBar breakdown={normalizeBreakdown(opp.scoreBreakdown)} />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">Quick stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Created" value={timeAgo(opp.createdAt)} />
              <Row label="Updated" value={timeAgo(opp.updatedAt)} />
              <Row label="By" value={opp.createdBy === "system" ? "AI" : opp.createdBy} />
              <Row label="Niche" value={opp.niche.replace(/_/g, " ")} />
              <Row label="Status" value={opp.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}

function SourceSignalsTab({ signalIds }: { signalIds: string[] }) {
  const { data, loading } = useApi<{ signals: Signal[] }>(`/api/signals?limit=100`);
  const signals = (data?.signals ?? []).filter((s) => signalIds.includes(s.id));
  if (loading) return <div className="p-3 text-xs text-slate-500">Loading signals…</div>;
  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardContent className="space-y-2 p-3">
        {signals.map((s) => (
          <div
            key={s.id}
            className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase">
                {s.signalType.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-slate-500">{timeAgo(s.processedAt)}</span>
            </div>
            <div className="mt-1 line-clamp-1 font-medium">{s.title}</div>
            <div className="mt-0.5 text-xs text-slate-500">{s.snippet}</div>
            <a
              href={s.sourceUrl}
              className="mt-1 inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
        {signals.length === 0 && <div className="text-xs text-slate-500">No source signals.</div>}
      </CardContent>
    </Card>
  );
}

function SourceProductsTab({ productIds }: { productIds: string[] }) {
  const { data, loading } = useApi<{ products: Product[] }>(`/api/products?limit=100`);
  const products = (data?.products ?? []).filter((p) => productIds.includes(p.id));
  if (loading) return <div className="p-3 text-xs text-slate-500">Loading products…</div>;
  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardContent className="space-y-2 p-3">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="block rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{p.title}</div>
              <span className="text-xs font-semibold text-emerald-400">
                {formatUsd(p.priceUsd ?? 0)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {p.creator} · {p.sourcePlatform.replace(/_/g, " ")}
            </div>
          </Link>
        ))}
        {products.length === 0 && <div className="text-xs text-slate-500">No source products.</div>}
      </CardContent>
    </Card>
  );
}
