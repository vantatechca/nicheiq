"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useApi } from "@/lib/hooks/use-api";
import { formatUsd, formatNumber, formatRange, timeAgo } from "@/lib/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  title: string;
  creator: string | null;
  creatorId: string | null;
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

export default function ProductDetailPage() {
const router = useRouter();
const [promoting, setPromoting] = useState(false);

const handlePromote = async () => {
  if (!product) return;
  setPromoting(true);
  try {
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${product.title} — replication play`,
        summary: `Replicate ${product.title} by ${product.creator ?? "unknown"} in the ${product.niche.replace(/_/g, " ")} niche.`,
        niche: product.niche,
        opportunityType: "replication",
        buildEffort: "week",
        projectedRevenueUsd: product.estMonthlyRevenueHigh ?? 1000,
      }),
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    toast.success("Opportunity created!");
    router.push(`/opportunities/${data.data.opportunity.id}`);
  } catch {
    toast.error("Failed to promote");
  } finally {
    setPromoting(false);
  }
};

  const { id } = useParams<{ id: string }>();

  // Main product fetch.
  const { data: productData, loading } = useApi<{ product: Product }>(
    id ? `/api/products/${id}` : null,
  );
  const product = productData?.product ?? null;

  // Creator lookup — only if product has a creatorId. Lookup by id.
  const { data: creatorData } = useApi<{ creator: Creator }>(
    product?.creatorId ? `/api/creators/${product.creatorId}` : null,
  );
  const creator = creatorData?.creator ?? null;

  // Similar products — same niche.
  const { data: similarData } = useApi<{ products: Product[] }>(
    product ? `/api/products?niche=${product.niche}&limit=10` : null,
  );
  const similar = (similarData?.products ?? [])
    .filter((p) => p.id !== product?.id)
    .slice(0, 6);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading product…</div>;
  if (!product) return <div className="p-6 text-sm text-slate-400">Product not found.</div>;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/products">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to products
        </Link>
      </Button>

      <PageHeader
        title={product.title}
        description={`${product.creator ?? "Unknown"} · ${product.sourcePlatform.replace(/_/g, " ")}`}
        actions={
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
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-800 bg-slate-900/40">
            <div className="relative aspect-[16/9] bg-slate-800">
              {product.thumbnailUrl ? (
                <img src={product.thumbnailUrl} alt={product.title} className="h-full w-full object-cover" />
              ) : null}
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
                      : "—"
                  }
                />
                <Stat label="Niche" value={product.niche.replace(/_/g, " ")} />
                <Stat
                  label="Est. monthly sales"
                  value={
                    product.estMonthlySalesLow != null && product.estMonthlySalesHigh != null
                      ? `${formatNumber(product.estMonthlySalesLow)}–${formatNumber(product.estMonthlySalesHigh)}`
                      : "—"
                  }
                />
                <Stat
                  label="Est. monthly revenue"
                  value={formatRange(product.estMonthlyRevenueLow ?? 0, product.estMonthlyRevenueHigh ?? 0)}
                />
                <Stat label="First seen" value={timeAgo(product.createdAt)} />
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
                        <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {s.ratingAvg.toFixed(1)}
                      </>
                    ) : null}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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