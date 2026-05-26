import { getDb } from "@/lib/db/client";
import { nicheEnum, products, signals } from "@/lib/db/schema";
import type { RawSignal } from "@/lib/crawlers/types";
import { selectModel } from "@/lib/ai/client";
import {
  inferNiche,
  safeNiche,
  subredditHintFor,
  type NicheValue,
} from "@/lib/crawlers/niche-classify";
import { sql } from "drizzle-orm";

type SignalType =
  | "marketplace_listing"
  | "social_mention"
  | "launch"
  | "dataset_drop"
  | "expired_listing";

const SIGNAL_TYPE: Record<string, SignalType> = {
  reddit: "social_mention",
  hacker_news: "social_mention",
  product_hunt: "launch",
  etsy: "marketplace_listing",
  envato: "marketplace_listing",
  kaggle: "dataset_drop",
  flippa: "expired_listing",
};

// Platforms whose crawled items are real PRODUCTS (a listing with a price,
// rating, and revenue) rather than discussion/trend chatter. These get routed
// into the `products` table — which carries first_seen_at / last_seen_at and
// the revenue columns — instead of `signals`. Everything else (Reddit, HN,
// Product Hunt launches, etc.) stays as a signal.
//
// Exported + pure so it can be unit-tested without a DB or AI call.
const PRODUCT_PLATFORMS = new Set<string>([
  "etsy",
  "gumroad",
  "creative_market",
  "envato",
  "design_bundles",
  "kdp",
  "redbubble",
  "lemonsqueezy",
  "sellfy",
  "payhip",
  "teachers_pay_teachers",
]);

export function isProductPlatform(platform: string): boolean {
  return PRODUCT_PLATFORMS.has(platform);
}

// ── Tier 2 (Claude Haiku) batch niche classifier ──────────────────────────────

async function classifyNiches(
  items: Array<{ title: string; snippet?: string; tags?: string[]; platform?: string }>,
): Promise<NicheValue[]> {
  if (!items.length) return [];

  const SYSTEM = `You are a digital product market classifier. Classify each item into exactly one niche.
Valid niches (choose the single closest match): ${nicheEnum.enumValues.join(", ")}.

Routing rules:
- Fonts / typefaces / display or script fonts → font_bundle.
- Logos / logo templates / badges / emblems → logo_template.
- Icon sets → icon_pack. Mockups → mockup_template. Photoshop actions/effects → photoshop_action. Illustration/graphic packs → illustration_pack.
- Business cards → business_card_template. Flyers/brochures/posters/print layouts → the closest print/marketing template (e.g. social_media_template), else other.
- WordPress themes or plugins → wordpress_theme. Non-WordPress HTML / site templates → website_template. Shopify apps → shopify_app.
- After Effects / Premiere / motion / openers → motion_graphic; full edit templates → video_template; logo stings/intros → intro_template; LUTs → video_lut.
- Audio loops/samples → sample_pack; drum kits → drum_kit; MIDI → midi_pack; SFX → sound_effect_pack.
- Scripts / plugins / small tools → micro_saas or browser_extension as fits; Discord bots → discord_bot; game/Unity assets → game_asset or unity_asset.
- Use the subreddit as a STRONG hint when present (r/Notion→notion_template, r/KDP→kdp_low_content, r/gamedev→game_asset, r/ChatGPT→ai_prompt_pack, r/shopify→shopify_app, r/lightroom→lightroom_preset).
- Only use "other" when nothing above fits at all.
Output ONLY a JSON array of objects shaped {"i": <item number>, "niche": "<one valid niche>"}. No explanation. No markdown.`;

  // Classify with tier 2 (Claude Haiku) rather than tier 1 (Qwen/OpenRouter):
  // it follows the index-keyed JSON format more reliably and bills to the same
  // Anthropic credit the rest of the app already uses. Chunks of 30 keep each
  // request's output well within budget while limiting any bad chunk's blast
  // radius to its own 30 items.
  const CHUNK = 30;
  const classifier = selectModel({ tier: 2 });
  const out: NicheValue[] = [];

  for (let start = 0; start < items.length; start += CHUNK) {
    const chunk = items.slice(start, start + CHUNK);
    const list = chunk
      .map((s, i) => {
        const sub = s.tags?.[0]; // first tag is subreddit, if any
        const hintNiche = subredditHintFor(sub);
        const hint = hintNiche ? ` [HINT: likely ${hintNiche}]` : "";
        const subTag = sub ? ` [subreddit: ${sub}]` : "";
        return `${i + 1}. "${s.title}"${subTag}${hint}`;
      })
      .join("\n");

    try {
      const { text } = await classifier.complete({
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Classify these ${chunk.length} items:\n${list}\n\nReturn a JSON array of objects, one per item, each {"i": <the item number above>, "niche": "<one valid niche>"}. Include every item number from 1 to ${chunk.length}.`,
          },
        ],
        // ~22 tokens per {"i":N,"niche":"..."} object + headroom; ~708 for 30,
        // comfortably above the real output size so it won't truncate.
        maxTokens: chunk.length * 22 + 48,
        temperature: 0,
      });

      // Pull the first JSON array even if the model wraps it in prose or fences.
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error(`no JSON array in response: ${text.slice(0, 120)}`);
      const parsed = JSON.parse(match[0]) as unknown;
      if (!Array.isArray(parsed)) throw new Error("response is not a JSON array");

      // Key results by their declared index, so a miscount (extra/missing
      // element) only affects the items actually missing — not the whole chunk.
      const byIndex = new Map<number, NicheValue>();
      for (const el of parsed) {
        if (el && typeof el === "object") {
          const o = el as { i?: unknown; niche?: unknown };
          const i = typeof o.i === "number" ? o.i : Number(o.i);
          if (Number.isInteger(i) && i >= 1 && i <= chunk.length && typeof o.niche === "string") {
            byIndex.set(i, safeNiche(o.niche));
          }
        }
      }

      const missing = chunk.length - byIndex.size;
      if (missing > 0) {
        console.warn(
          `[persist-signals] niche chunk ${start}–${start + chunk.length}: ${missing} of ${chunk.length} unclassified — falling back for those only`,
        );
      }
      chunk.forEach((s, i) => out.push(byIndex.get(i + 1) ?? inferNiche(s)));
    } catch (err) {
      console.warn(
        `[persist-signals] niche chunk ${start}–${start + chunk.length} failed (${
          err instanceof Error ? err.message : String(err)
        }) — falling back for this chunk`,
      );
      for (const s of chunk) out.push(inferNiche(s));
    }
  }

  return out;
}

// ── Row builders ────────────────────────────────────────────────────────────

// signals.niche and products.niche share the same nicheEnum, so this one cast
// type works for both row shapes.
type NicheColumn = (typeof products.niche.enumValues)[number];

function toSignalRow(s: RawSignal, niche: string, now: Date) {
  return {
    id: crypto.randomUUID(),
    signalType: SIGNAL_TYPE[s.sourcePlatform] ?? "social_mention",
    sourcePlatform: s.sourcePlatform,
    sourceUrl: s.sourceUrl,
    sourceId: s.sourceId,
    niche: niche as NicheColumn,
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
    firstSeenAt: now,
    processedAt: now,
    ideaIdsLinked: [] as string[],
  };
}

function toProductRow(s: RawSignal, niche: string, now: Date) {
  return {
    // Deterministic, non-seed id. Seed rows match /^product_\d+$/ — this never
    // does, so promoted market products stay visible in list endpoints.
    id: `product_from_signal_${s.sourcePlatform}_${s.sourceId}`,
    sourcePlatform: s.sourcePlatform,
    sourceUrl: s.sourceUrl,
    title: s.title,
    creator: s.creator?.displayName ?? s.creator?.handle ?? null,
    creatorId: s.creator?.handle ?? null,
    priceUsd: s.priceUsd ?? null,
    currency: "USD",
    ratingAvg: s.ratingAvg ?? null,
    ratingCount: s.ratingCount ?? null,
    estMonthlySalesLow: s.estMonthlySales?.low ?? null,
    estMonthlySalesHigh: s.estMonthlySales?.high ?? null,
    estMonthlyRevenueLow: s.estMonthlyRevenue?.low ?? null,
    estMonthlyRevenueHigh: s.estMonthlyRevenue?.high ?? null,
    niche: niche as NicheColumn,
    tags: s.tags ?? [],
    thumbnailUrl: s.thumbnailUrl ?? null,
    rawJson: s.rawJson,
    opportunityId: null,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function persistSignals(normalized: RawSignal[]): Promise<number> {
  if (!normalized.length) return 0;

  // Classify niches in one batch call (Tier 2 — Claude Haiku)
  const niches = await classifyNiches(
    normalized.map((s) => ({
      title: s.title,
      snippet: s.snippet,
      tags: s.tags,
      platform: s.sourcePlatform,
    })),
  );

  const now = new Date();

  // Partition: marketplace listings → products, everything else → signals.
  const productRows: ReturnType<typeof toProductRow>[] = [];
  const signalRows: ReturnType<typeof toSignalRow>[] = [];
  normalized.forEach((s, i) => {
    const niche = niches[i] ?? "other";
    if (isProductPlatform(s.sourcePlatform)) productRows.push(toProductRow(s, niche, now));
    else signalRows.push(toSignalRow(s, niche, now));
  });

  const db = getDb();
  let affected = 0;

  // ── Products (marketplace listings) ──────────────────────────────────────
  if (productRows.length) {
    // Dedup by the products unique key (sourcePlatform, sourceUrl).
    const deduped = productRows.filter(
      (row, idx, arr) =>
        arr.findLastIndex(
          (r) => r.sourcePlatform === row.sourcePlatform && r.sourceUrl === row.sourceUrl,
        ) === idx,
    );

    const result = await db
      .insert(products)
      .values(deduped)
      .onConflictDoUpdate({
        target: [products.sourcePlatform, products.sourceUrl],
        set: {
          // Refresh the volatile market fields…
          title: sql`excluded.title`,
          priceUsd: sql`excluded.price_usd`,
          ratingAvg: sql`excluded.rating_avg`,
          ratingCount: sql`excluded.rating_count`,
          estMonthlySalesLow: sql`excluded.est_monthly_sales_low`,
          estMonthlySalesHigh: sql`excluded.est_monthly_sales_high`,
          estMonthlyRevenueLow: sql`excluded.est_monthly_revenue_low`,
          estMonthlyRevenueHigh: sql`excluded.est_monthly_revenue_high`,
          niche: sql`excluded.niche`,
          tags: sql`excluded.tags`,
          thumbnailUrl: sql`excluded.thumbnail_url`,
          rawJson: sql`excluded.raw_json`,
          // …and bump last_seen. first_seen_at and opportunity_id are
          // deliberately omitted, so a re-crawl never resets the discovery date
          // nor wipes the link to an opportunity we later launched from this row.
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
    affected += result.rowCount ?? 0;
  }

  // ── Signals (discussion / trend chatter) ─────────────────────────────────
  if (signalRows.length) {
    // Dedup by the signals unique key (sourcePlatform, sourceId).
    const deduped = signalRows.filter(
      (row, idx, arr) =>
        arr.findLastIndex(
          (r) => r.sourcePlatform === row.sourcePlatform && r.sourceId === row.sourceId,
        ) === idx,
    );

    const result = await db
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
          // processed_at = "last seen", refreshed every crawl. first_seen_at is
          // omitted from the SET, so it's preserved from the original insert.
          processedAt: sql`excluded.processed_at`,
        },
      });
    affected += result.rowCount ?? 0;
  }

  return affected;
}