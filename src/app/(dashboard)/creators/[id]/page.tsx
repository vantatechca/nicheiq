"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApi } from "@/lib/hooks/use-api";
import { formatUsd, formatNumber, timeAgo } from "@/lib/utils/format";

interface PricingTier {
  label: string;
  priceUsd: number;
}

interface Playbook {
  pricingTiers?: PricingTier[];
  postingCadence?: string;
  topTags?: string[];
  funnels?: string[];
  signatureStyle?: string;
}

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  sourcePlatform: string;
  followerCount: number | null;
  productCount: number;
  totalEstRevenueUsd: number;
  niches: string[];
  playbook: Playbook | null;
  notes: string | null;
  lastEnrichedAt: string | null;
  createdAt: string;
}

interface Product {
  id: string;
  title: string;
  niche: string;
  priceUsd: number | null;
  creatorId: string | null;
}

export default function CreatorDetailPage() {
  const [deepDiving, setDeepDiving] = useState(false);
  const { id } = useParams<{ id: string }>();

  const { data: creatorData, loading } = useApi<{ creator: Creator }>(
    id ? `/api/creators/${id}` : null,
  );
  const c = creatorData?.creator ?? null;

  const { data: productsData } = useApi<{ products: Product[] }>(
    c ? `/api/products?limit=200` : null,
  );
  const products = (productsData?.products ?? []).filter((p) => p.creatorId === c?.id);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading creator…</div>;
  if (!c) return <div className="p-6 text-sm text-slate-400">Creator not found.</div>;

  const playbook = c.playbook ?? {};

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link href="/creators">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-slate-800" />
          )}
          <div>
            <div className="text-2xl font-semibold tracking-tight">{c.displayName}</div>
            <div className="text-sm text-slate-400">
              {c.handle} · {c.sourcePlatform.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {c.profileUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={c.profileUrl} target="_blank" rel="noreferrer">
                Profile <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={deepDiving}
            onClick={async () => {
              setDeepDiving(true);
              try {
                const res = await fetch(`/api/creators/${c.id}/deep-dive`, { method: "POST" });
                if (!res.ok) throw new Error("Failed");
                toast.success("Deep dive complete — refreshing…");
                setTimeout(() => window.location.reload(), 1000);
              } catch {
                toast.error("Deep dive failed");
              } finally {
                setDeepDiving(false);
              }
            }}
          >
            {deepDiving ? "Analyzing…" : "Deep dive"}
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
              <CardDescription>What&apos;s working — pricing, cadence, funnels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {playbook.pricingTiers && playbook.pricingTiers.length > 0 ? (
                <div>
                  <div className="text-xs uppercase text-slate-400">Pricing tiers</div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    {playbook.pricingTiers.map((t) => (
                      <div
                        key={t.label}
                        className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-center"
                      >
                        <div className="text-[10px] uppercase text-slate-500">{t.label}</div>
                        <div className="mt-0.5 text-base font-semibold">
                          {formatUsd(t.priceUsd)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {playbook.postingCadence ? (
                <div>
                  <div className="text-xs uppercase text-slate-400">Posting cadence</div>
                  <div className="text-sm text-slate-200">{playbook.postingCadence}</div>
                </div>
              ) : null}
              {playbook.topTags && playbook.topTags.length > 0 ? (
                <div>
                  <div className="text-xs uppercase text-slate-400">Top tags</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {playbook.topTags.map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {playbook.funnels && playbook.funnels.length > 0 ? (
                <div>
                  <div className="text-xs uppercase text-slate-400">Funnels</div>
                  <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                    {playbook.funnels.map((f: string) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {playbook.signatureStyle ? (
                <div>
                  <div className="text-xs uppercase text-slate-400">Signature style</div>
                  <div className="text-sm text-slate-200">{playbook.signatureStyle}</div>
                </div>
              ) : null}
              {!playbook.pricingTiers &&
              !playbook.postingCadence &&
              !playbook.topTags &&
              !playbook.funnels &&
              !playbook.signatureStyle ? (
                <div className="text-xs text-slate-500">
                  No playbook data yet. Click Deep dive to enrich.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {products.length === 0 && (
                <div className="text-xs text-slate-500">No products tracked yet.</div>
              )}
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
              <Row
                label="Followers"
                value={formatNumber(c.followerCount ?? 0, { compact: true })}
              />
              <Row label="Products" value={String(c.productCount)} />
              <Row
                label="Est. revenue"
                value={formatUsd(c.totalEstRevenueUsd, { compact: true })}
              />
              <Row
                label="Niches"
                value={c.niches.map((n) => n.replace(/_/g, " ")).join(", ") || "—"}
              />
              <Row
                label="Last enriched"
                value={c.lastEnrichedAt ? timeAgo(c.lastEnrichedAt) : "—"}
              />
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
