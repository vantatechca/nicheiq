"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { mockResellable } from "@/mock/data";
import { formatUsd, timeAgo } from "@/lib/utils/format";
import { RESELLABLE_STATUSES } from "@/lib/utils/constants";
import type { ResellableAsset } from "@/lib/types";

const ASSET_TYPES = [
  { value: "dataset", label: "Dataset" },
  { value: "plr_pack", label: "PLR pack" },
  { value: "expired_etsy", label: "Expired Etsy" },
  { value: "expired_domain", label: "Expired domain" },
  { value: "flippa_listing", label: "Flippa listing" },
  { value: "microacquire_listing", label: "MicroAcquire listing" },
] as const;

type AssetTypeValue = (typeof ASSET_TYPES)[number]["value"];

export default function ResellablePage() {
  const [tab, setTab] = useState("all");
  const [assets, setAssets] = useState<ResellableAsset[]>(mockResellable);

  // New-asset dialog state
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assetType, setAssetType] = useState<AssetTypeValue>("dataset");
  const [title, setTitle] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [license, setLicense] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = tab === "all" ? assets : assets.filter((r) => r.status === tab);

  function resetForm() {
    setAssetType("dataset");
    setTitle("");
    setSourcePlatform("");
    setSourceUrl("");
    setAskingPrice("");
    setLicense("");
    setNotes("");
  }

  async function createAsset() {
    if (title.trim().length < 2) {
      toast.error("Title needs at least 2 characters");
      return;
    }
    if (!sourcePlatform.trim()) {
      toast.error("Source platform is required");
      return;
    }
    try {
      // Pre-validate to give a friendlier message than the zod URL error.
      new URL(sourceUrl);
    } catch {
      toast.error("Source URL must be a valid URL (e.g. https://...)");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/resellable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType,
          title: title.trim(),
          sourcePlatform: sourcePlatform.trim(),
          sourceUrl: sourceUrl.trim(),
          askingPriceUsd: askingPrice ? Number(askingPrice) : undefined,
          license: license.trim() || undefined,
          notes: notes.trim() || undefined,
          status: "new",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data?: { asset: ResellableAsset } };
      const created = json.data?.asset;
      if (created) setAssets((prev) => [created, ...prev]);
      toast.success(`Tracking "${title.trim()}"`);
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(`Create failed: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Resellable assets"
        description={`${assets.length} datasets, PLR packs, expired Etsy & Flippa listings.`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Track new asset
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({assets.length})</TabsTrigger>
          {RESELLABLE_STATUSES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label} ({assets.filter((r) => r.status === s.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {a.assetType.replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    variant={
                      a.status === "acquired"
                        ? "success"
                        : a.status === "negotiating"
                        ? "warning"
                        : a.status === "passed"
                        ? "destructive"
                        : a.status === "reviewing"
                        ? "info"
                        : "outline"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                <h3 className="mt-2 text-sm font-medium">{a.title}</h3>
                <div className="mt-2 grid gap-1 text-xs">
                  <Row label="Asking" value={a.askingPriceUsd ? formatUsd(a.askingPriceUsd) : "—"} />
                  <Row label="Monthly rev" value={a.monthlyRevenueUsd ? formatUsd(a.monthlyRevenueUsd) : "—"} />
                  <Row label="License" value={a.license ?? "—"} />
                  <Row label="Niche" value={a.niche ? a.niche.replace(/_/g, " ") : "—"} />
                  <Row label="Source" value={a.sourcePlatform.replace(/_/g, " ")} />
                  <Row label="Found" value={timeAgo(a.createdAt)} />
                </div>
                {a.notes ? (
                  <p className="mt-2 line-clamp-2 text-[11px] text-slate-400">{a.notes}</p>
                ) : null}
                {a.assetType === "plr_pack" && a.license ? (
                  <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">
                    PLR license: {a.license}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                      Source <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/brain?mode=dataset_review&id=${a.id}`}>Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Track a new asset</DialogTitle>
            <DialogDescription>
              Datasets, PLR packs, expired listings, Flippa or MicroAcquire deals — anything you might
              repackage and resell.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetTypeValue)}>
                  <SelectTrigger className="border-slate-800 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Asking price (USD, optional)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="border-slate-800 bg-slate-950"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "10-year SEC EDGAR earnings reactions dataset"'
                className="border-slate-800 bg-slate-950"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Source platform</Label>
                <Input
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  placeholder="e.g. kaggle, flippa, microacquire"
                  className="border-slate-800 bg-slate-950"
                />
              </div>
              <div className="space-y-1">
                <Label>License (optional)</Label>
                <Input
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="MIT, CC-BY, PLR-commercial…"
                  className="border-slate-800 bg-slate-950"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Source URL</Label>
              <Input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="border-slate-800 bg-slate-950"
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="What's the repackage angle? Risks? Distribution wedge?"
                className="border-slate-800 bg-slate-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={createAsset} disabled={creating}>
              {creating ? "Creating…" : "Track asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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