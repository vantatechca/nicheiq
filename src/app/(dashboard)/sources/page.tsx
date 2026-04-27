"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play, Plus, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { SourceDetailDialog } from "@/components/sources/source-detail-dialog";
import { mockSources } from "@/mock/data";
import { timeAgo } from "@/lib/utils/format";
import { SOURCE_PLATFORMS } from "@/lib/utils/constants";
import type { Source } from "@/lib/types";

export default function SourcesPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(mockSources);
  const [detail, setDetail] = useState<Source | null>(null);

  const filtered = rows.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.sourcePlatform.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    toast.success("Source updated");
  }

  function testCrawl(id: string) {
    toast.info("Crawl queued (mock)…", { description: `Will inspect ${id} and report back.` });
  }

  return (
    <>
      <PageHeader
        title="Sources"
        description={`${rows.length} integrations — toggle, retry, edit cron.`}
        actions={
          <Button size="sm">
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

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
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
                  onCheckedChange={() => toggle(s.id)}
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
                  <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px]">{s.cronSchedule}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last run</span>
                  <span>{timeAgo(s.lastRunAt)}</span>
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
        })}
      </div>

      {detail ? (
        <SourceDetailDialog
          source={detail}
          open={detail !== null}
          onOpenChange={(o) => !o && setDetail(null)}
        />
      ) : null}
    </>
  );
}
