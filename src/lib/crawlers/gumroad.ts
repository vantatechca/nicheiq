import type { CrawlerModule, RawSignal } from "./types";
import {
  estimateFromProxy,
  estimateFromSales,
  estimateFromSalesAmortized,
  PROXY_CONVERSION,
  revenueBasisTag,
  type MonthlyEstimate,
} from "./revenue";
import { runApifyActor } from "./apify";

// Gumroad discovery via a licensed Apify actor — NOT direct scraping.
//
// The previous build fetched https://gumroad.com/discover_search directly. That
// is an unofficial, ToS-sensitive endpoint and breaks the project rule that
// ToS-sensitive marketplaces go through the proxy layer (Apify / ScrapingBee /
// Bright Data) — never direct. That's why this crawler sat disabled. We now
// mirror the Etsy crawler: drive a discovery-oriented Apify actor through the
// async run helper (start → poll → fetch dataset → abort on cancel), then
// normalize its output resiliently.
//
// The default actor (overridable via config.actorId or GUMROAD_APIFY_ACTOR)
// crawls Gumroad search/category pages and returns product listings. If you
// swap actors and the new one expects a different per-keyword input shape,
// pass config.inputOverride — it's shallow-merged into each run's input.
const DEFAULT_ACTOR_ID = "nifty.codes~gumroad-products-scraper";

// When an actor returns a real lifetime sales count but no publish date (the
// common Gumroad case), we amortize the total over this many months to imply a
// monthly rate. Conservative by design — tune if you learn the real listing age.
const SALES_WINDOW_MONTHS = 12;

const DIGITAL_QUERIES = [
  "notion template",
  "excel template",
  "canva template",
  "printable planner",
  "budget tracker",
  "social media template",
  "ebook guide",
  "prompt pack",
  "figma kit",
  "swipe file",
  "checklist template",
  "content calendar",
  "resume template",
  "lightroom preset",
  "procreate brush",
];

// Output shape from the Gumroad Apify actor. Every field is optional and several
// have alternate key names: community actors rename fields across versions, so
// declaring the variants lets normalize() fall back cleanly instead of dropping
// rows. Prices appear as cents (number), dollars (number) or a "$12" string
// depending on the actor — parseUsd() handles all three.
interface ApifyGumroadItem {
  id?: string | number;
  productId?: string | number;
  permalink?: string;
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  url?: string;
  productUrl?: string;
  webUrl?: string;
  // Price variants
  price?: number | string;
  priceCents?: number;
  formattedPrice?: string;
  priceFormatted?: string;
  // Rating variants
  rating?: number | string | null;
  ratingAverage?: number | string | null;
  ratingsAverage?: number | string | null;
  ratingCount?: number | string | null;
  ratingsCount?: number | string | null;
  reviewsCount?: number | string | null;
  ratings?: { count?: number | string; average?: number | string } | null;
  // Sales-count variants (typically present only in an actor's "deep" mode).
  // Snake_case keys (sales_count, etc.) are read via a record cast in
  // pickSalesCount() so we don't have to declare snake_case identifiers here.
  sales?: number | string | null;
  salesCount?: number | string | null;
  numberOfSales?: number | string | null;
  totalSales?: number | string | null;
  salesText?: string | null; // e.g. "1,234 sales"
  // Publish/created date variants (frequently absent on Gumroad).
  createdAt?: string | null;
  publishedAt?: string | null;
  dateCreated?: string | null;
  releasedAt?: string | null;
  // Seller variants
  seller?: string | { name?: string; username?: string; url?: string } | null;
  sellerName?: string;
  creator?: string;
  // Media + tags
  thumbnailUrl?: string;
  thumbnail?: string;
  previewUrl?: string;
  coverUrl?: string;
  tags?: string[];
  // Provenance, attached by parse()
  _query?: string;
}

interface GumroadPage {
  keyword: string;
  items: ApifyGumroadItem[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Coerce a number | "1,234" | "$12.50" to a clean number, or undefined. */
function toNum(v: number | string | null | undefined): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Resolve a USD price from the actor's many price shapes.
 *   • priceCents (number)        → /100
 *   • formattedPrice/string "$X" → parsed dollars
 *   • price (number)             → treated as dollars
 * Returns undefined when nothing usable is present (don't fabricate 0).
 */
function parseUsd(r: ApifyGumroadItem): number | undefined {
  if (typeof r.priceCents === "number" && Number.isFinite(r.priceCents)) {
    return r.priceCents / 100;
  }
  const formatted = r.formattedPrice ?? r.priceFormatted;
  if (formatted != null) {
    const n = toNum(formatted);
    if (n != null) return n;
  }
  if (typeof r.price === "string") return toNum(r.price);
  if (typeof r.price === "number") return r.price; // already dollars
  return undefined;
}

function pickRatingAvg(r: ApifyGumroadItem): number | undefined {
  return (
    toNum(r.rating) ??
    toNum(r.ratingAverage) ??
    toNum(r.ratingsAverage) ??
    toNum(r.ratings?.average)
  );
}

function pickRatingCount(r: ApifyGumroadItem): number | undefined {
  return (
    toNum(r.ratingCount) ??
    toNum(r.ratingsCount) ??
    toNum(r.reviewsCount) ??
    toNum(r.ratings?.count)
  );
}

/** Real lifetime sales count, across actor field-name variants. */
function pickSalesCount(r: ApifyGumroadItem): number | undefined {
  const rec = r as Record<string, unknown>;
  const raw =
    r.sales ??
    r.salesCount ??
    r.numberOfSales ??
    r.totalSales ??
    r.salesText ??
    (rec.sales_count as number | string | undefined) ??
    (rec.sales_text as string | undefined) ??
    (rec.number_of_sales as number | string | undefined);
  return toNum(raw as number | string | null | undefined);
}

/** A parseable publish/created date, or undefined. Most Gumroad actors omit this. */
function pickPublishedAt(r: ApifyGumroadItem): string | undefined {
  const rec = r as Record<string, unknown>;
  const raw =
    r.createdAt ??
    r.publishedAt ??
    r.dateCreated ??
    r.releasedAt ??
    (rec.created_at as string | undefined) ??
    (rec.published_at as string | undefined) ??
    (rec.date as string | undefined);
  if (typeof raw !== "string") return undefined;
  return Number.isFinite(Date.parse(raw)) ? raw : undefined;
}

function pickSeller(r: ApifyGumroadItem): { handle: string; profileUrl?: string } | undefined {
  if (typeof r.seller === "string" && r.seller) {
    return { handle: r.seller, profileUrl: `https://gumroad.com/${r.seller}` };
  }
  if (r.seller && typeof r.seller === "object") {
    const handle = r.seller.username ?? r.seller.name;
    if (handle) {
      return { handle, profileUrl: r.seller.url ?? `https://gumroad.com/${r.seller.username ?? ""}` };
    }
  }
  const flat = r.sellerName ?? r.creator;
  if (flat) return { handle: flat, profileUrl: `https://gumroad.com/${flat}` };
  return undefined;
}

const gumroad: CrawlerModule = {
  source: "gumroad",
  // Apify does the headless work server-side, so the caller doesn't need a
  // browser — same footing as the Etsy crawler.
  requiresHeadless: false,

  async crawl({ config }) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error("APIFY_TOKEN missing — add it to .env.local");

    // Accept the new contract (keywords/limit, matching Etsy) and the legacy
    // one (queries/count) so existing source rows keep working.
    const keywords =
      (config.keywords as string[] | undefined) ??
      (config.queries as string[] | undefined) ??
      DIGITAL_QUERIES;
    const limit = Math.min(
      (config.limit as number | undefined) ?? (config.count as number | undefined) ?? 50,
      100,
    );
    const actorId =
      (config.actorId as string | undefined) ??
      process.env.GUMROAD_APIFY_ACTOR ??
      DEFAULT_ACTOR_ID;
    const category = config.category as string | undefined;
    const minRating = config.minRating as number | undefined;
    const inputOverride = (config.inputOverride as Record<string, unknown> | undefined) ?? {};
    const delayMs = (config.perRequestDelayMs as number | undefined) ?? 500;

    const pages: GumroadPage[] = [];

    // Sequential (not Promise.all) with a polite delay: one Apify run per
    // keyword keeps memory low and avoids hammering the actor's concurrency.
    for (const keyword of keywords) {
      const input: Record<string, unknown> = {
        // Common search-param aliases across Gumroad actors; unknown extras are
        // ignored by most actors. inputOverride wins if a specific actor differs.
        query: keyword,
        search: keyword,
        searchQuery: keyword,
        maxItems: limit,
        maxRecords: limit,
        sort: "best_selling",
        ...(category ? { category } : {}),
        ...(minRating != null ? { rating: minRating, minRating } : {}),
        ...inputOverride,
      };

      // Async run → poll → fetch dataset, with explicit /abort on any
      // cancellation. The previous build used run-sync-get-dataset-items
      // with AbortSignal.timeout(130_000); when that fired, the Apify run
      // kept executing on Apify's side (we never knew its run ID), so
      // every client-side timeout silently billed the full actor run.
      // runApifyActor() exposes the run ID up front and POSTs /abort on
      // any exit path that isn't a clean SUCCEEDED.
      try {
        console.log(`[gumroad-apify] running actor "${actorId}" for: "${keyword}"`);
        const { items, status } = await runApifyActor<ApifyGumroadItem>({
          actorId,
          token,
          input,
          runTimeoutSecs: 120,
          memoryMbytes:   512,
          label:          "gumroad-apify",
        });

        if (status !== "SUCCEEDED") {
          console.warn(`[gumroad-apify] run ${status} for "${keyword}"`);
          pages.push({ keyword, items: [] });
        } else {
          console.log(`[gumroad-apify] got ${items.length} items for "${keyword}"`);
          pages.push({ keyword, items: Array.isArray(items) ? items : [] });
        }
      } catch (e) {
        console.warn(`[gumroad-apify] run failed for "${keyword}":`, e);
        pages.push({ keyword, items: [] });
      }

      await sleep(delayMs);
    }

    return pages;
  },

  parse(raw: unknown): unknown[] {
    const pages = (raw as GumroadPage[] | undefined) ?? [];
    return pages.flatMap((p) => p.items.map((item) => ({ ...item, _query: p.keyword })));
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as ApifyGumroadItem[];
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const r of items) {
      const title = r.name ?? r.title;
      const link = r.url ?? r.productUrl ?? r.webUrl;
      const sourceId =
        r.id != null ? String(r.id) :
        r.productId != null ? String(r.productId) :
        r.permalink ?? link;

      if (!title || !link || !sourceId) continue;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      const priceUsd = parseUsd(r);
      // Skip anything over $500 — likely a course/bundle, not a simple digital
      // product (mirrors the original heuristic). Only filters when we have a price.
      if (priceUsd != null && priceUsd > 500) continue;

      const ratingAvg = pickRatingAvg(r);
      const ratingCount = pickRatingCount(r);
      const salesCount = pickSalesCount(r);
      const publishedIso = pickPublishedAt(r);

      // Revenue estimate, best basis available — strongest evidence first:
      //   1. sales-derived   — real lifetime sales + a real date → true monthly.
      //   2. sales-amortized — real lifetime sales, no date → amortized window.
      //   3. ratings-proxy   — no sales count → infer from rating_count.
      //   (none)             — nothing usable → no estimate (don't fabricate).
      // Both sales-backed bases count as "proven" in the Database-1 workbook.
      let est: MonthlyEstimate | undefined;
      if (salesCount != null && publishedIso) {
        est = estimateFromSales({
          totalSales: salesCount,
          publishedAtIso: publishedIso,
          priceUsd: priceUsd ?? 0,
        });
      } else if (salesCount != null) {
        est = estimateFromSalesAmortized({
          totalSales: salesCount,
          priceUsd: priceUsd ?? 0,
          windowMonths: SALES_WINDOW_MONTHS,
        });
      } else if (ratingCount != null) {
        est = estimateFromProxy({
          proxyCount: ratingCount,
          priceUsd: priceUsd ?? 0,
          basis: "ratings-proxy",
          conversion: PROXY_CONVERSION.ratings,
        });
      }

      const description = r.description ?? r.summary;
      const tags = [
        r._query,
        ...(r.tags ?? []).slice(0, 10),
        est ? revenueBasisTag(est.basis) : undefined,
      ].filter((x): x is string => Boolean(x));

      signals.push({
        sourcePlatform: "gumroad",
        sourceId,
        sourceUrl: link,
        title,
        snippet: description ? description.slice(0, 280) : undefined,
        priceUsd,
        ratingAvg,
        ratingCount,
        estMonthlySales: est?.sales,
        estMonthlyRevenue: est?.revenue,
        capturedAt: new Date().toISOString(),
        tags,
        thumbnailUrl: r.thumbnailUrl ?? r.thumbnail ?? r.previewUrl ?? r.coverUrl ?? undefined,
        creator: pickSeller(r),
        rawJson: r as unknown as Record<string, unknown>,
      });
    }

    console.log(`[gumroad-apify] normalized ${signals.length} signals`);
    return signals;
  },
};

export default gumroad;