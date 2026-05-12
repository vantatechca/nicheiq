import { getDb } from "@/lib/db/client";
import { signals } from "@/lib/db/schema";
import type { RawSignal } from "@/lib/crawlers/types";
import { sql } from "drizzle-orm";

type SignalType =
  | "marketplace_listing"
  | "social_mention"
  | "launch"
  | "dataset_drop"
  | "expired_listing";

const SIGNAL_TYPE: Record<string, SignalType> = {
  reddit:        "social_mention",
  hacker_news:   "social_mention",
  product_hunt:  "launch",
  etsy:          "marketplace_listing",
  envato:        "marketplace_listing",
  kaggle:        "dataset_drop",
  flippa:        "expired_listing",
};

export async function persistSignals(normalized: RawSignal[]): Promise<number> {
  if (!normalized.length) return 0;

  const rows = normalized.map((s) => ({
    id: crypto.randomUUID(),
    signalType: SIGNAL_TYPE[s.sourcePlatform] ?? "social_mention",
    sourcePlatform: s.sourcePlatform,
    sourceUrl: s.sourceUrl,
    sourceId: s.sourceId,
    niche: "other" as const,          // synthesize-opportunities classifies later
    title: s.title,
    snippet: s.snippet ?? "",
    engagement: {
      priceUsd:     s.priceUsd ?? null,
      ratingAvg:    s.ratingAvg ?? null,
      ratingCount:  s.ratingCount ?? null,
      tags:         s.tags ?? [],
      creator:      s.creator ?? null,
      rawScore:     (s.rawJson as any)?.score
                    ?? (s.rawJson as any)?.votesCount
                    ?? (s.rawJson as any)?.num_favorers
                    ?? 0,
    },
    score: Math.min(
  100,
  Math.log10(
    1 +
    ((s.rawJson as any)?.score ?? 0) +
    ((s.rawJson as any)?.votesCount ?? 0) * 3 +
    ((s.rawJson as any)?.num_favorers ?? 0) +
    ((s.rawJson as any)?.num_comments ?? 0) * 0.5,
  ) * 20,
),
    processedAt: new Date(),
    ideaIdsLinked: [] as string[],
  }));

  const result = await getDb()
  .insert(signals)
  .values(rows)
  .onConflictDoUpdate({
  target: [signals.sourcePlatform, signals.sourceId],
  set: {
    title:       sql`excluded.title`,
    snippet:     sql`excluded.snippet`,
    engagement:  sql`excluded.engagement`,
    score:       sql`excluded.score`,
    processedAt: sql`excluded.processed_at`,
  },
});

  return result.rowCount ?? 0;
}
