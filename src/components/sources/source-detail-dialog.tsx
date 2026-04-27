"use client";

import { useState } from "react";
import { Play, Settings, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Source } from "@/lib/types";
import { SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { timeAgo } from "@/lib/utils/format";

interface Props {
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourceDetailDialog({ source, open, onOpenChange }: Props) {
  const platform = SOURCE_PLATFORMS.find((p) => p.value === source.sourcePlatform);
  const [enabled, setEnabled] = useState(source.enabled);
  const [cron, setCron] = useState(source.cronSchedule);

  // Mock crawl history for the modal
  const recentRuns = [
    {
      id: "run_1",
      status: source.lastRunStatus,
      startedAt: source.lastRunAt ?? new Date().toISOString(),
      itemsFound: source.itemsTracked,
      itemsNew: Math.max(0, source.itemsTracked - 24),
      duration: "12.4s",
    },
    {
      id: "run_2",
      status: "ok" as const,
      startedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
      itemsFound: 24,
      itemsNew: 8,
      duration: "9.1s",
    },
    {
      id: "run_3",
      status: "ok" as const,
      startedAt: new Date(Date.now() - 12 * 3600_000).toISOString(),
      itemsFound: 31,
      itemsNew: 12,
      duration: "11.8s",
    },
    {
      id: "run_4",
      status: source.lastError ? ("error" as const) : ("ok" as const),
      startedAt: new Date(Date.now() - 18 * 3600_000).toISOString(),
      itemsFound: source.lastError ? 0 : 18,
      itemsNew: 0,
      duration: source.lastError ? "0.4s" : "10.2s",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{platform?.icon}</span>
            {source.label}
          </DialogTitle>
          <DialogDescription>
            <code className="rounded bg-slate-800 px-1 text-[10px] uppercase">{platform?.category}</code>
            <span className="ml-2">{source.sourcePlatform.replace(/_/g, " ")}</span>
            {source.requiresHeadless ? (
              <Badge variant="warning" className="ml-2 text-[10px]">
                headless required
              </Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {source.lastError ? (
          <div className="flex gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <div>
              <div className="font-medium">Last run errored</div>
              <div>{source.lastError}</div>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="runs">Recent runs</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3">
              <div>
                <div className="text-sm font-medium">Enabled</div>
                <div className="text-xs text-slate-500">
                  When off, cron is paused but on-demand crawls still work.
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  setEnabled(v);
                  toast.success(v ? "Source enabled" : "Source paused");
                }}
              />
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3 w-3" /> Cron schedule
              </div>
              <Input
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="border-slate-800 bg-slate-950 font-mono text-xs"
                placeholder="0 */6 * * *"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Standard 5-field cron. Tip: <code className="bg-slate-800 px-1">*/30 * * * *</code> = every 30 min.
              </p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-1 text-sm font-medium">Items tracked</div>
              <div className="font-mono text-2xl">{source.itemsTracked}</div>
            </div>
          </TabsContent>

          <TabsContent value="runs">
            <ScrollArea className="h-72">
              <div className="space-y-1.5">
                {recentRuns.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          r.status === "ok" ? "success" : r.status === "error" ? "destructive" : "info"
                        }
                      >
                        {r.status}
                      </Badge>
                      <span className="text-slate-300">{timeAgo(r.startedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-slate-400">
                      <span>{r.itemsFound} found</span>
                      <span>+{r.itemsNew} new</span>
                      <span className="text-slate-500">{r.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json">
            <pre className="max-h-72 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
              {JSON.stringify({ ...source, config: source.config }, null, 2)}
            </pre>
            <p className="mt-2 text-[11px] text-slate-500">
              <ExternalLink className="mr-1 inline h-3 w-3" />
              In production this is the row from <code className="bg-slate-800 px-1">sources</code> in Postgres.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-800 pt-3">
          <Button
            variant="outline"
            onClick={() => {
              toast.info("Test crawl queued (mock)");
            }}
          >
            <Play className="mr-1 h-3 w-3" /> Test crawl
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.success("Config saved");
              onOpenChange(false);
            }}
          >
            <Settings className="mr-1 h-3 w-3" /> Save config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
