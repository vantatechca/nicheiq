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
  | "print_on_demand"
  | "etsy_printable"
  | "notion_template"
  | "gumroad_ebook"
  | "kdp_low_content"
  | "course"
  | "ai_prompt_pack"
  | "figma_kit"
  | "wordpress_theme"
  | "shopify_app"
  | "lightroom_preset"
  | "sample_pack"
  | "video_template"
  | "dataset"
  | "plr_pack"
  | "micro_saas"
  | "browser_extension"
  | "discord_bot"
  | "game_asset"
  | "other";

const VALID_NICHES = new Set<NicheValue>([
  "print_on_demand",
  "etsy_printable",
  "notion_template",
  "gumroad_ebook",
  "kdp_low_content",
  "course",
  "ai_prompt_pack",
  "figma_kit",
  "wordpress_theme",
  "shopify_app",
  "lightroom_preset",
  "sample_pack",
  "video_template",
  "dataset",
  "plr_pack",
  "micro_saas",
  "browser_extension",
  "discord_bot",
  "game_asset",
  "other",
]);

const SIGNAL_TYPE: Record<string, SignalType> = {
  reddit: "social_mention",
  hacker_news: "social_mention",
  product_hunt: "launch",
  etsy: "marketplace_listing",
  envato: "marketplace_listing",
  kaggle: "dataset_drop",
  flippa: "expired_listing",
};

function safeNiche(v: string): NicheValue {
  return VALID_NICHES.has(v as NicheValue) ? (v as NicheValue) : "other";
}

// ── Tier 1 batch niche classifier ─────────────────────────────────────────────

async function classifyNiches(
  items: Array<{ title: string; snippet?: string; tags?: string[]; platform?: string }>,
): Promise<NicheValue[]> {
  if (!items.length) return [];

  // Subreddit → niche direct mapping (no AI needed for these)
  const subredditMap: Record<string, NicheValue> = {
    Notion: "notion_template",
    NotionTemplates: "notion_template",
    EtsySellers: "etsy_printable",
    Etsy: "etsy_printable",
    KDP: "kdp_low_content",
    selfpublishing: "kdp_low_content",
    lightroom: "lightroom_preset",
    gamedev: "game_asset",
    gamedesign: "game_asset",
    discordapp: "discord_bot",
    WordpressPlugins: "wordpress_theme",
    shopify: "shopify_app",
    VideoEditing: "video_template",
    datasets: "dataset",
    ChatGPT: "ai_prompt_pack",
    MidJourney: "ai_prompt_pack",
    AIPromptEngineering: "ai_prompt_pack",
    NoCode: "micro_saas",
    nocode: "micro_saas",
    microsaas: "micro_saas",
    SaaS: "micro_saas",
  };

  try {
    const tier1 = selectModel({ tier: 1 });

    const list = items
      .map((s, i) => {
        const sub = s.tags?.[0]; // first tag is subreddit
        const hint = sub && subredditMap[sub] ? ` [HINT: likely ${subredditMap[sub]}]` : "";
        return `${i + 1}. "${s.title}"${s.tags?.length ? ` [subreddit: ${s.tags[0]}]` : ""}${hint}`;
      })
      .join("\n");

    const { text } = await tier1.complete({
      system: `You are a digital product market classifier. Classify each item into exactly one niche.
Valid niches: print_on_demand, etsy_printable, notion_template, gumroad_ebook, kdp_low_content, course, ai_prompt_pack, figma_kit, wordpress_theme, shopify_app, lightroom_preset, sample_pack, video_template, dataset, plr_pack, micro_saas, browser_extension, discord_bot, game_asset, other.

Rules:
- Use the subreddit as a STRONG hint. A post from r/Notion → notion_template. r/KDP → kdp_low_content. r/gamedev → game_asset. r/ChatGPT → ai_prompt_pack. r/shopify → shopify_app. r/discordapp → discord_bot. r/lightroom → lightroom_preset.
- Only use "other" if the content has NO connection to any digital product niche.
- When a HINT is provided, use it unless the title clearly contradicts it.
Output ONLY a JSON array of strings, one per item, in the same order. No explanation. No markdown.`,
      messages: [
        {
          role: "user",
          content: `Classify these ${items.length} items:\n${list}\n\nOutput exactly ${items.length} niche strings as a JSON array.`,
        },
      ],
      maxTokens: 800,
      temperature: 0,
    });

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as string[];

    if (!Array.isArray(parsed) || parsed.length !== items.length) {
      // Fallback: use subreddit map directly
      return items.map((s) => {
        const sub = s.tags?.[0];
        return sub ? (subredditMap[sub] ?? "other") : "other";
      });
    }

    return parsed.map(safeNiche);
  } catch {
    console.warn("[persist-signals] niche classification failed — using subreddit map");
    return items.map((s) => {
      const sub = s.tags?.[0];
      return sub ? (subredditMap[sub] ?? "other") : "other";
    });
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
      platform: s.sourcePlatform,
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
      priceUsd: s.priceUsd ?? null,
      ratingAvg: s.ratingAvg ?? null,
      ratingCount: s.ratingCount ?? null,
      tags: s.tags ?? [],
      creator: s.creator ?? null,
      rawScore:
        (s.rawJson as any)?.score ??
        (s.rawJson as any)?.votesCount ??
        (s.rawJson as any)?.num_favorers ??
        0,
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
        title: sql`excluded.title`,
        snippet: sql`excluded.snippet`,
        engagement: sql`excluded.engagement`,
        score: sql`excluded.score`,
        niche: sql`excluded.niche`,
        processedAt: sql`excluded.processed_at`,
      },
    });

  return result.rowCount ?? 0;
}
