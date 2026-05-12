import { getDb } from "@/lib/db/client";
import { signals } from "@/lib/db/schema";
import type { RawSignal } from "@/lib/crawlers/types";
import { selectModel } from "@/lib/ai/client";
import { sql } from "drizzle-orm";

type SignalType =
  | "marketplace_listing"
  | "social_mention"
  | "launch"
  | "dataset_drop"
  | "expired_listing";

type NicheValue =
  | "print_on_demand" | "etsy_printable" | "notion_template" | "gumroad_ebook"
  | "kdp_low_content" | "course" | "ai_prompt_pack" | "figma_kit"
  | "wordpress_theme" | "shopify_app" | "lightroom_preset" | "sample_pack"
  | "video_template" | "dataset" | "plr_pack" | "micro_saas"
  | "browser_extension" | "discord_bot" | "game_asset" | "other";

const VALID_NICHES = new Set<NicheValue>([
  "print_on_demand", "etsy_printable", "notion_template", "gumroad_ebook",
  "kdp_low_content", "course", "ai_prompt_pack", "figma_kit", "wordpress_theme",
  "shopify_app", "lightroom_preset", "sample_pack", "video_template", "dataset",
  "plr_pack", "micro_saas", "browser_extension", "discord_bot", "game_asset", "other",
]);

const SIGNAL_TYPE: Record<string, SignalType> = {
  reddit:        "social_mention",
  hacker_news:   "social_mention",
  product_hunt:  "launch",
  etsy:          "marketplace_listing",
  envato:        "marketplace_listing",
  kaggle:        "dataset_drop",
  flippa:        "expired_listing",
};

function safeNiche(v: string): NicheValue {
  return VALID_NICHES.has(v as NicheValue) ? (v as NicheValue) : "other";
}

// ── Tier 1 batch niche classifier ─────────────────────────────────────────────

async function classifyNiches(
  items: Array<{ title: string; snippet?: string; tags?: string[] }>,
): Promise<NicheValue[]> {
  if (!items.length) return [];

  try {
    const tier1 = selectModel({ tier: 1 });

    const list = items
      .map(
        (s, i) =>
          `${i + 1}. "${s.title}"${s.tags?.length ? ` [${s.tags.slice(0, 5).join(", ")}]` : ""}`,
      )
      .join("\n");

    const { text } = await tier1.complete({
      system: `You are a digital product market classifier. Classify each item into exactly one niche.
Valid niches: print_on_demand, etsy_printable, notion_template, gumroad_ebook, kdp_low_content, course, ai_prompt_pack, figma_kit, wordpress_theme, shopify_app, lightroom_preset, sample_pack, video_template, dataset, plr_pack, micro_saas, browser_extension, discord_bot, game_asset, other.
Output ONLY a JSON array of strings, one per item, in the same order. No explanation. No markdown.`,
      messages: [
        {
          role: "user",
          content: `Classify these ${items.length} items:\n${list}\n\nOutput exactly ${items.length} niche strings as a JSON array.`,
        },
      ],
      maxTokens: 500,
      temperature: 0,
    });

    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as string[];

    if (!Array.isArray(parsed) || parsed.length !== items.length) {
      return items.map(() => "other" as NicheValue);
    }

    return parsed.map(safeNiche);
  } catch {
    console.warn("[persist-signals] niche classification failed — defaulting to 'other'");
    return items.map(() => "other" as NicheValue);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function persistSignals(normalized: RawSignal[]): Promise<number> {
  if (!normalized.length) return 0;

  // Classify niches in one batch call (Tier 1 — cheap + fast)
  const niches = await classifyNiches(
    normalized.map((s) => ({
      title: s.title,
      snippet: s.snippet,
      tags: s.tags,
    })),
  );

  const rows = normalized.map((s, i) => ({
    id: crypto.randomUUID(),
    signalType: SIGNAL_TYPE[s.sourcePlatform] ?? "social_mention",
    sourcePlatform: s.sourcePlatform,
    sourceUrl: s.sourceUrl,
    sourceId: s.sourceId,
    niche: niches[i] ?? "other",
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

  // Deduplicate rows by (sourcePlatform, sourceId) before insert
  const deduped = rows.filter(
    (row, idx, arr) =>
      arr.findLastIndex(
        (r) => r.sourcePlatform === row.sourcePlatform && r.sourceId === row.sourceId,
      ) === idx,
  );

  const result = await getDb()
    .insert(signals)
    .values(deduped)
    .onConflictDoUpdate({
      target: [signals.sourcePlatform, signals.sourceId],
      set: {
        title:       sql`excluded.title`,
        snippet:     sql`excluded.snippet`,
        engagement:  sql`excluded.engagement`,
        score:       sql`excluded.score`,
        niche:       sql`excluded.niche`,
        processedAt: sql`excluded.processed_at`,
      },
    });

  return result.rowCount ?? 0;
}