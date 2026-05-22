"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Pause, Play, Sparkles, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { NICHE_LIST, SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { timeAgo, formatNumber } from "@/lib/utils/format";
import { useSse } from "@/lib/hooks/use-sse";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { toast } from "sonner";
import type { Signal } from "@/lib/types";

export default function FeedPage() {
  const [niche, setNiche] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [paused, setPaused] = useState(false);
  // Tracks which signals the current session already saved, so the
  // Bookmark icon can flip to "filled" without a re-fetch. This is
  // session-local; on reload we'd need a /api/signals?saved=1 to
  // restore — out of scope for this pass.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Tracks last vote direction per signal so the thumbs-up/down icons
  // can colour to indicate the recorded vote.
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});

  async function reactToSignal(signalId: string, kind: "vote_up" | "vote_down" | "save") {
    try {
      const res = await api.post<{ kind: string; alreadySaved: boolean }>(
        `/api/signals/${signalId}/react`,
        { kind },
      );
      if (kind === "save") {
        if (res?.alreadySaved) {
          toast.message("Already saved");
        } else {
          setSavedIds((prev) => new Set(prev).add(signalId));
          toast.success("Saved");
        }
      } else {
        const dir = kind === "vote_up" ? "up" : "down";
        setVotes((prev) => ({ ...prev, [signalId]: dir }));
        toast.success(dir === "up" ? "Voted up" : "Voted down");
      }
    } catch (err) {
      toast.error("Couldn't react: " + (err as Error).message);
    }
  }

  // Live updates over SSE (real-time).
  const { items: liveItems, connected } = useSse<Signal>({
    url: "/api/feed/sse",
    enabled: !paused,
  });

  // Initial backlog from REST (replaces mockSignals).
  const { data: backlogData } = useApi<{ signals: Signal[] }>(`/api/signals?limit=100`);
  const baseSignals: Signal[] = backlogData?.signals ?? [];

  // Merge live + backlog and dedupe by id.
  const merged = [...liveItems, ...baseSignals];
  const seen = new Set<string>();
  const dedup = merged.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  let filtered = dedup;
  if (niche) filtered = filtered.filter((s) => s.niche === niche);
  if (type) filtered = filtered.filter((s) => s.signalType === type);
  if (platform) filtered = filtered.filter((s) => s.sourcePlatform === platform);
  if (minScore) filtered = filtered.filter((s) => s.score >= minScore);

  const signalTypes = [
    { value: "marketplace_listing", label: "Marketplace" },
    { value: "trend_query", label: "Trend query" },
    { value: "social_mention", label: "Social mention" },
    { value: "launch", label: "Launch" },
    { value: "milestone", label: "Milestone" },
    { value: "dataset_drop", label: "Dataset drop" },
    { value: "plr_release", label: "PLR release" },
    { value: "expired_listing", label: "Expired listing" },
  ];

  const status = paused ? "Paused" : connected ? "Streaming new signals" : "Reconnecting…";
  const statusDotClass = paused
    ? "bg-amber-400"
    : connected
      ? "animate-pulse-soft bg-emerald-400"
      : "bg-slate-600";

  return (
    <>
      <PageHeader
        title="Live feed"
        description={
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
            {status}
            {liveItems.length > 0 ? (
              <Badge variant="info" className="text-[10px]">
                {liveItems.length} new
              </Badge>
            ) : null}
          </span>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
            {paused ? (
              <>
                <Play className="mr-1 h-4 w-4" /> Resume
              </>
            ) : (
              <>
                <Pause className="mr-1 h-4 w-4" /> Pause stream
              </>
            )}
          </Button>
        }
      />

      <Card className="mb-4 border-slate-800 bg-slate-900/40">
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-slate-400">Min score</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-32"
            />
            <span className="font-mono text-slate-300">{minScore}</span>
          </div>
          <FilterChips
            options={NICHE_LIST.map((n) => ({ value: n.value, label: n.label }))}
            value={niche}
            onChange={setNiche}
            emptyLabel="All niches"
          />
          <FilterChips
            options={signalTypes}
            value={type}
            onChange={setType}
            emptyLabel="All types"
          />
          <FilterChips
            options={SOURCE_PLATFORMS.map((p) => ({
              value: p.value,
              label: `${p.icon} ${p.label}`,
            }))}
            value={platform}
            onChange={setPlatform}
            emptyLabel="All platforms"
          />
        </div>
      </Card>

      <div className="space-y-2">
        {filtered.slice(0, 50).map((s) => (
          <Card key={s.id} className="border-slate-800 bg-slate-900/40">
            <CardHeader className="flex flex-row items-start justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {s.signalType.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.sourcePlatform.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.niche.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-slate-500">{timeAgo(s.processedAt)}</span>
                  <Badge variant="info" className="ml-auto font-mono text-[10px]">
                    score {Math.round(s.score)}
                  </Badge>
                </div>
                <div className="mt-1 line-clamp-1 text-sm font-medium">{s.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.snippet}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {s.engagement?.upvotes
                    ? `${formatNumber(s.engagement.upvotes, { compact: true })} upvotes · `
                    : ""}
                  {s.engagement?.comments ? `${s.engagement.comments} comments · ` : ""}
                  {s.engagement?.sales ? `${s.engagement.sales} sales` : ""}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${
                    votes[s.id] === "up" ? "text-emerald-300 hover:text-emerald-200" : ""
                  }`}
                  onClick={() => reactToSignal(s.id, "vote_up")}
                  aria-label="Vote up"
                  title="Vote up"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${
                    votes[s.id] === "down" ? "text-rose-300 hover:text-rose-200" : ""
                  }`}
                  onClick={() => reactToSignal(s.id, "vote_down")}
                  aria-label="Vote down"
                  title="Vote down"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${
                    savedIds.has(s.id) ? "text-amber-300 hover:text-amber-200" : ""
                  }`}
                  onClick={() => reactToSignal(s.id, "save")}
                  aria-label="Save signal"
                  title={savedIds.has(s.id) ? "Saved" : "Save for later"}
                >
                  <Bookmark className={`h-3 w-3 ${savedIds.has(s.id) ? "fill-current" : ""}`} />
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                  <Link href={`/brain?mode=global&signal=${s.id}`}>
                    <Sparkles className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No signals match. Loosen filters above.
          </div>
        ) : null}
      </div>
    </>
  );
}