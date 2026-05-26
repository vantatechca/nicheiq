"use client";

// Product detail. For MARKET products (crawled) it shows the catalog stats +
// the external creator's playbook. For MINE products (launched from an
// opportunity → opportunityId set), market stats are genuinely empty (no sales
// yet), so instead of a bare, boring page we surface the REAL launch story:
// the linked opportunity's score, projected revenue, build effort, status, and
// summary. No faked sales/ratings — that would undercut the data's credibility.

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Star, Sparkles, Rocket, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBadge } from "@/components/shared/score-badge";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { formatUsd, formatNumber, formatRange, timeAgo } from "@/lib/utils/format";
import { useState } from "react";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  creator: string | null;
  creatorId: string | null;
  opportunityId: string | null;
  sourcePlatform: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  niche: string;
  tags: string[];
  priceUsd: number | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  estMonthlySalesLow: number | null;
  estMonthlySalesHigh: number | null;
  estMonthlyRevenueLow: number | null;
  estMonthlyRevenueHigh: number | null;
  createdAt: string;
}

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number | null;
  productCount: number;
  totalEstRevenueUsd: number;
  niches: string[];
}

interface Opportunity {
  id: string;
  title: string;
  summary: string;
  status: string;
  score: number;
  opportunityType: string;
  buildEffort: string;
  projectedRevenueUsd: number;
}

// Deterministic gradient from the niche string, so a thumbnail-less (launched)
// product gets an intentional-looking cover instead of a black box.
function nicheGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 40) % 360;
  return `linear-gradient(135deg, hsl(${h} 45% 22%), hsl(${h2} 55% 32%))`;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const { id } = useParams<{ id: string }>();

  const {
    data: productData,
    loading,
    error,
  } = useApi<{ product: Product }>(id ? `/api/products/${id}` : null);
  const product = productData?.product ?? null;

  const { data: creatorData } = useApi<{ creator: Creator }>(
    product?.creatorId ? `/api/creators/${product.creatorId}` : null,
  );
  const creator = creatorData?.creator ?? null;

  // Linked opportunity — only for launched ("Mine") products.
  const { data: oppData } = useApi<{ opportunity: Opportunity }>(
    product?.opportunityId ? `/api/opportunities/${product.opportunityId}` : null,
  );
  const opportunity = oppData?.opportunity ?? null;

  const { data: similarData } = useApi<{ products: Product[] }>(
    product ? `/api/products?niche=${product.niche}&limit=10` : null,
  );
  const similar = (similarData?.products ?? []).filter((p) => p.id !== product?.id).slice(0, 6);

  const handlePromote = async () => {
    if (!product || promoting) return;
    setPromoting(true);
    try {
      const res = await api.post<{ opportunity: { id: string; title: string } }>(
        `/api/products/${product.id}/promote-to-opportunity`,
      );
      if (!res?.opportunity) throw new Error("Empty response");
      toast.success("Tracked as opportunity", { description: res.opportunity.title });
      router.push(`/opportunities/${res.opportunity.id}`);
    } catch (err) {
      toast.error("Couldn't promote: " + (err as Error).message);
    } finally {
      setPromoting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading product…</div>;
  if (error && error.status !== 404)
    return (
      <div className="p-6 text-sm text-red-400">Couldn&apos;t load product: {error.message}</div>
    );
  if (!product) return <div className="p-6 text-sm text-slate-400">Product not found.</div>;

  const isMine = !!product.opportunityId;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/products">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to products
        </Link>
      </Button>

      <PageHeader
        title={product.title}
        description={
          isMine
            ? `Launched from opportunity · ${product.niche.replace(/_/g, " ")}`
            : `${product.creator ?? "Unknown"} · ${product.sourcePlatform.replace(/_/g, " ")}`
        }
        actions={
          isMine ? (
            opportunity ? (
              <Button size="sm" asChild>
                <Link href={`/opportunities/${opportunity.id}`}>
                  <ArrowUpRight className="mr-1 h-4 w-4" /> Open opportunity
                </Link>
              </Button>
            ) : null
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                  Source <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button size="sm" onClick={handlePromote} disabled={promoting}>
                <Sparkles className="mr-1 h-4 w-4" />
                {promoting ? "Promoting…" : "Promote to opportunity"}
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-800 bg-slate-900/40">
            <div
              className="relative flex aspect-[16/9] items-end bg-slate-800"
              style={
                !product.thumbnailUrl ? { background: nicheGradient(product.niche) } : undefined
              }
            >
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="p-5">
                  {isMine ? (
                    <Badge className="mb-2 bg-emerald-500/20 text-emerald-300">
                      <Rocket className="mr-1 h-3 w-3" /> Launched product
                    </Badge>
                  ) : null}
                  <div className="text-lg font-semibold text-white/90">{product.title}</div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    {product.niche.replace(/_/g, " ")}
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Price" value={formatUsd(product.priceUsd ?? 0)} />
                <Stat
                  label="Rating"
                  value={
                    product.ratingAvg != null
                      ? `${product.ratingAvg.toFixed(1)} (${formatNumber(product.ratingCount ?? 0, { compact: true })})`
                      : isMine
                        ? "New — no reviews yet"
                        : "—"
                  }
                />
                <Stat label="Niche" value={product.niche.replace(/_/g, " ")} />
                <Stat
                  label={isMine ? "Sales (since launch)" : "Est. monthly sales"}
                  value={
                    product.estMonthlySalesLow != null && product.estMonthlySalesHigh != null
                      ? `${formatNumber(product.estMonthlySalesLow)}–${formatNumber(product.estMonthlySalesHigh)}`
                      : isMine
                        ? "Tracking…"
                        : "—"
                  }
                />
                <Stat
                  label={isMine ? "Projected revenue" : "Est. monthly revenue"}
                  value={
                    isMine && opportunity
                      ? `${formatUsd(opportunity.projectedRevenueUsd, { compact: true })}/mo target`
                      : formatRange(
                          product.estMonthlyRevenueLow ?? 0,
                          product.estMonthlyRevenueHigh ?? 0,
                        )
                  }
                />
                <Stat
                  label={isMine ? "Launched" : "First seen"}
                  value={timeAgo(product.createdAt)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Similar in niche</CardTitle>
              <CardDescription>Same niche, different creator.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {similar.length === 0 && (
                <div className="text-xs text-slate-500">No other products in this niche yet.</div>
              )}
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/products/${s.id}`}
                  className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="line-clamp-1 text-sm font-medium">{s.title}</div>
                    <span className="text-xs text-emerald-400">{formatUsd(s.priceUsd ?? 0)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {s.creator}
                    {s.ratingAvg != null ? (
                      <>
                        {" · "}
                        <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" />{" "}
                        {s.ratingAvg.toFixed(1)}
                      </>
                    ) : null}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* MINE: show the linked opportunity — the real story behind a launch. */}
          {opportunity ? (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle>Opportunity</CardTitle>
                <CardDescription>Why this was launched.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <ScoreBadge score={opportunity.score} size="lg" />
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {opportunity.status}
                  </Badge>
                </div>
                <p className="line-clamp-4 text-xs text-slate-400">{opportunity.summary}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat
                    label="Projected"
                    value={`${formatUsd(opportunity.projectedRevenueUsd, { compact: true })}/mo`}
                  />
                  <Stat label="Build effort" value={opportunity.buildEffort.replace(/_/g, " ")} />
                  <Stat label="Type" value={opportunity.opportunityType.replace(/_/g, " ")} />
                  <Stat label="Niche" value={product.niche.replace(/_/g, " ")} />
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/opportunities/${opportunity.id}`}>Open full opportunity →</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* MARKET: show the external creator's playbook. */}
          {creator ? (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle>Creator</CardTitle>
                <CardDescription>Reverse-engineer playbook.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {creator.avatarUrl ? (
                    <img
                      src={creator.avatarUrl}
                      alt={creator.displayName}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-slate-800" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{creator.displayName}</div>
                    <div className="truncate text-xs text-slate-500">{creator.handle}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Stat
                    label="Followers"
                    value={formatNumber(creator.followerCount ?? 0, { compact: true })}
                  />
                  <Stat label="Products" value={String(creator.productCount)} />
                  <Stat
                    label="Est. revenue"
                    value={formatUsd(creator.totalEstRevenueUsd, { compact: true })}
                  />
                  <Stat label="Niches" value={String(creator.niches.length)} />
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link href={`/creators/${creator.id}`}>Open playbook →</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Neither linked yet — keep the column from being empty. */}
          {!opportunity && !creator ? (
            <Card className="border-dashed border-slate-800 bg-slate-900/20">
              <CardContent className="p-4 text-xs text-slate-500">
                No linked creator or opportunity for this product yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-200">{value}</div>
    </div>
  );
}