"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play, Plus, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SourceDetailDialog } from "@/components/sources/source-detail-dialog";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { timeAgo } from "@/lib/utils/format";
import { SOURCE_PLATFORMS, WIRED_CRAWLER_PLATFORMS } from "@/lib/utils/constants";
import type { Source } from "@/lib/types";

// Derived from the registry's source of truth so this picker can never drift
// out of sync with what actually has a working crawler. Pulls label + icon
// from SOURCE_PLATFORMS so there's no duplicated metadata to maintain.
const CRAWLER_PLATFORMS = WIRED_CRAWLER_PLATFORMS.map((value) => {
  const meta = SOURCE_PLATFORMS.find((p) => p.value === value);
  return { value, label: meta?.label ?? value };
});

export default function SourcesPage() {
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Source | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const { data, refetch } = useApi<{ sources: Source[] }>("/api/sources");
  const raw = data?.sources ?? [];
  const rows = raw.map((s) => ({ ...s, enabled: optimistic[s.id] ?? s.enabled }));

  // Create-source dialog.
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<string>("reddit");
  const [label, setLabel] = useState("");

  async function createSource() {
    if (label.trim().length < 2) {
      toast.error("Label needs at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/sources", { sourcePlatform: platform, label: label.trim() });
      toast.success(`Source "${label.trim()}" created`);
      setLabel("");
      setPlatform("reddit");
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error((err as Error).message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const filtered = rows.filter(
    (s) =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.sourcePlatform.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by each platform's declared category (marketplace / asset / trend)
  // so the dashboard mirrors how you think about sources. Falls back to "other"
  // for any platform without a known category, so nothing is ever hidden.
  const categoryOf = (s: Source): string =>
    SOURCE_PLATFORMS.find((p) => p.value === s.sourcePlatform)?.category ?? "other";

  function renderCard(s: Source) {
    const platformMeta = SOURCE_PLATFORMS.find((p) => p.value === s.sourcePlatform);
    return (
      <Card
        key={s.id}
        className="cursor-pointer border-slate-800 bg-slate-900/40 transition hover:border-primary/40"
        onClick={() => setDetail(s)}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">{platformMeta?.icon}</span> {s.label}
            </CardTitle>
            <CardDescription className="capitalize">{platformMeta?.category}</CardDescription>
          </div>
          <Switch
            checked={s.enabled}
            onCheckedChange={() => toggle(s.id, s.enabled)}
            onClick={(e) => e.stopPropagation()}
          />
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status</span>
            <Badge
              variant={
                s.lastRunStatus === "ok"
                  ? "success"
                  : s.lastRunStatus === "error"
                    ? "destructive"
                    : s.lastRunStatus === "running"
                      ? "info"
                      : "outline"
              }
            >
              {s.lastRunStatus}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cron</span>
            <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px]">
              {s.cronSchedule}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Last run</span>
            <span>{s.lastRunAt ? timeAgo(s.lastRunAt) : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Items tracked</span>
            <span className="font-mono">{s.itemsTracked}</span>
          </div>
          {s.requiresHeadless ? (
            <Badge variant="warning" className="text-[10px]">
              headless required
            </Badge>
          ) : null}
          {s.lastError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-200">
              {s.lastError}
            </div>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                testCrawl(s.id);
              }}
            >
              <Play className="mr-1 h-3 w-3" /> Test crawl
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setDetail(s);
              }}
            >
              <Settings className="mr-1 h-3 w-3" /> Config
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function toggle(id: string, currentEnabled: boolean) {
    const next = !currentEnabled;
    setOptimistic((prev) => ({ ...prev, [id]: next }));
    try {
      await api.patch(`/api/sources/${id}`, { enabled: next });
      toast.success(next ? "Source enabled" : "Source disabled");
    } catch (err) {
      setOptimistic((prev) => ({ ...prev, [id]: currentEnabled }));
      toast.error((err as Error).message || "Toggle failed");
    } finally {
      refetch();
    }
  }

  async function testCrawl(id: string) {
    toast.info("Crawl queued…", {
      description: `Inspecting ${id}. Results will appear in signals.`,
    });
    try {
      await api.post(`/api/sources/${id}/test-crawl`);
    } catch (err) {
      toast.error((err as Error).message || "Crawl failed to queue");
    }
  }

  return (
    <>
      <PageHeader
        title="Sources"
        description={`${rows.length} integrations — toggle, retry, edit cron.`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New source
          </Button>
        }
      />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <CardContent className="p-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sources…"
            className="h-9 max-w-sm border-slate-800 bg-slate-950"
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          No sources configured yet. Add one to start collecting signals.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          No sources match “{search}”.
        </div>
      ) : null}

      {(
        [
          {
            key: "marketplace",
            title: "Marketplaces",
            hint: "Digital-product listings — tracked with price, rating, and revenue.",
          },
          {
            key: "asset",
            title: "Assets",
            hint: "Datasets, APIs, and other reusable building blocks.",
          },
          {
            key: "trend",
            title: "Trend sources",
            hint: "Discussions, launches, and early demand signals.",
          },
          { key: "other", title: "Other", hint: "Sources without a known category." },
        ] as const
      ).map((group) => {
        const items = filtered.filter((s) => categoryOf(s) === group.key);
        if (items.length === 0) return null;
        return (
          <section key={group.key} className="mb-6">
            <div className="mb-1 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-slate-200">{group.title}</h2>
              <span className="font-mono text-xs text-slate-500">{items.length}</span>
            </div>
            <p className="mb-3 text-xs text-slate-500">{group.hint}</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{items.map(renderCard)}</div>
          </section>
        );
      })}

      {detail ? (
        <SourceDetailDialog
          source={detail}
          open={detail !== null}
          onOpenChange={(o) => !o && setDetail(null)}
          onChanged={refetch}
        />
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New source</DialogTitle>
            <DialogDescription>
              Only platforms with an active crawler are listed. Most need an API key set in the
              environment to return data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="border-slate-800 bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRAWLER_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='e.g. "Reddit r/SaaS"'
                className="border-slate-800 bg-slate-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLabel("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={createSource} disabled={saving}>
              {saving ? "Creating…" : "Create source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}