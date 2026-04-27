"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { findProduct, mockProducts, mockCreators } from "@/mock/data";
import { formatUsd, formatNumber, formatRange, timeAgo } from "@/lib/utils/format";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const product = findProduct(id);
  if (!product) return <div className="p-6 text-sm text-slate-400">Product not found.</div>;
  const creator = mockCreators.find((c) => c.id === product.creatorId);
  const similar = mockProducts.filter((p) => p.id !== product.id && p.niche === product.niche).slice(0, 6);

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
            <Button size="sm">
              <Sparkles className="mr-1 h-4 w-4" /> Promote to opportunity
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-800 bg-slate-900/40">
            <div className="relative aspect-[16/9] bg-slate-800">
              <img src={product.thumbnailUrl ?? ""} alt={product.title} className="h-full w-full object-cover" />
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
                  value={`${product.ratingAvg?.toFixed(1)} (${formatNumber(product.ratingCount, { compact: true })})`}
                />
                <Stat label="Niche" value={product.niche.replace(/_/g, " ")} />
                <Stat
                  label="Est. monthly sales"
                  value={`${formatNumber(product.estMonthlySalesLow)}–${formatNumber(product.estMonthlySalesHigh)}`}
                />
                <Stat
                  label="Est. monthly revenue"
                  value={formatRange(product.estMonthlyRevenueLow, product.estMonthlyRevenueHigh)}
                />
                <Stat label="First seen" value={timeAgo(product.firstSeenAt)} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Similar in niche</CardTitle>
              <CardDescription>Same niche, different creator.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {similar.map((s) => (
                <Link key={s.id} href={`/products/${s.id}`} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="line-clamp-1 text-sm font-medium">{s.title}</div>
                    <span className="text-xs text-emerald-400">{formatUsd(s.priceUsd ?? 0)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {s.creator} · <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {s.ratingAvg?.toFixed(1)}
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
                  <img src={creator.avatarUrl} alt={creator.displayName} className="h-12 w-12 rounded-full" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{creator.displayName}</div>
                    <div className="truncate text-xs text-slate-500">{creator.handle}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Followers" value={formatNumber(creator.followerCount, { compact: true })} />
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
