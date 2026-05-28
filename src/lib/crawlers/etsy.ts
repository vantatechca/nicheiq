import type { CrawlerModule, RawSignal } from "./types";
import {
  estimateFromProxy,
  PROXY_CONVERSION,
  revenueBasisTag,
  type MonthlyEstimate,
} from "./revenue";
import { runApifyActor } from "./apify";

const ACTOR_ID = "automation-lab~etsy-scraper";

const DEFAULT_KEYWORDS = [
  "canva template",
  "notion template",
  "printable planner",
  "svg cut file",
  "lightroom preset",
  "social media template",
  "resume template",
  "procreate brush",
  "digital planner",
  "excel template",
];

// Output shape from automation-lab~etsy-scraper.
// title/productUrl/listingUrl and the volume fields (favorites/reviews/etc.) are
// declared as optional alternates because the actor has used different key names
// across versions — having them on the type lets normalize() fall back cleanly.
interface ApifyEtsyItem {
  listingId?:     string | number;
  name?:          string;
  title?:         string;
  url?:           string;
  productUrl?:    string;
  listingUrl?:    string;
  price?:         string | number;
  originalPrice?: string | null;
  currency?:      string;
  imageUrl?:      string;
  shop?:          string;
  shopId?:        string;
  rating?:        number | null;
  // Volume proxies (names vary by actor version). Used to estimate revenue.
  favorites?:     number | string | null;
  numFavorers?:   number | string | null;
  reviews?:       number | string | null;
  reviewsCount?:  number | string | null;
  numReviews?:    number | string | null;
  ratingCount?:   number | string | null;
  onSale?:        boolean;
  freeShipping?:  boolean;
  availability?:  string;
  position?:      number;
  query?:         string;
  page?:          number;
  scrapedAt?:     string;
}

interface EtsyPage {
  keyword: string;
  items:   ApifyEtsyItem[];
}

function parsePrice(raw: string | number | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

/** Coerce a number-or-string-with-commas field to a clean integer. */
function num(v: number | string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

const etsy: CrawlerModule = {
  source: "etsy",
  requiresHeadless: false,

  async crawl({ config }) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error("APIFY_TOKEN missing — add it to .env.local");

    const keywords = (config.keywords as string[] | undefined) ?? DEFAULT_KEYWORDS;
    const limit    = (config.limit   as number | undefined)    ?? 50;

    // Category is OPTIONAL and unset by default. The previous build hardcoded
    // "craft-supplies-and-tools", which silently excluded digital downloads —
    // the exact products we want (templates, printables, presets). Leave it
    // unset to search all of Etsy, or pass config.category to scope a run.
    const category = config.category as string | undefined;

    const pages = await Promise.all(
      keywords.map(async (kw): Promise<EtsyPage> => {
        const input: Record<string, unknown> = {
          searchQuery: kw,
          maxItems:    Math.min(limit, 100),
          sort:        "most_relevant",
        };
        if (category) input.category = category;

        console.log(`[etsy-apify] running actor for: "${kw}"`);

        // Async run → poll → fetch dataset, with explicit /abort on any
        // cancellation. The previous build used run-sync-get-dataset-items
        // with AbortSignal.timeout(130_000); when that fired, the Apify run
        // kept executing on Apify's side (we never knew its run ID), so
        // every client-side timeout silently billed the full actor run.
        // runApifyActor() exposes the run ID up front and POSTs /abort on
        // any exit path that isn't a clean SUCCEEDED.
        try {
          const { items, status } = await runApifyActor<ApifyEtsyItem>({
            actorId:        ACTOR_ID,
            token,
            input,
            runTimeoutSecs: 120,
            memoryMbytes:   512,
            label:          "etsy-apify",
          });
          if (status !== "SUCCEEDED") {
            console.warn(`[etsy-apify] run ${status} for "${kw}"`);
            return { keyword: kw, items: [] };
          }
          console.log(`[etsy-apify] got ${items.length} items for "${kw}"`);
          return { keyword: kw, items };
        } catch (e) {
          // A single failed keyword shouldn't kill the whole batch. Previously
          // a thrown error here (network/abort) would reject Promise.all and
          // discard every successful keyword too.
          console.warn(`[etsy-apify] run failed for "${kw}":`, e);
          return { keyword: kw, items: [] };
        }
      }),
    );

    return pages;
  },

  parse(raw: unknown): unknown[] {
    const pages = raw as EtsyPage[];
    return pages.flatMap((p) =>
      p.items.map((item) => ({ ...item, _keyword: p.keyword }))
    );
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const seen    = new Set<string>();
    const signals: RawSignal[] = [];

    for (const item of parsed) {
      const r = item as ApifyEtsyItem & { _keyword: string };

      // Field-name resilience: the actor has labelled title/url differently
      // across versions. Fall back across the known variants before skipping.
      const title = r.name ?? r.title;
      const link  = r.url ?? r.productUrl ?? r.listingUrl;

      const listingIdMatch = link?.match(/\/listing\/(\d+)/);
      const sourceId =
        r.listingId != null ? String(r.listingId) :
        listingIdMatch?.[1]  ?? link;

      if (!sourceId || !link || !title) continue;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      const price = parsePrice(r.price);

      // Revenue estimate from a demand proxy (Etsy exposes no sales count):
      //   • favourites — preferred; PROXY_CONVERSION.favorites was written for it.
      //   • review count — fallback; like Gumroad ratings, a lower bound on buyers.
      // No proxy present → no estimate (don't fabricate a number).
      const favourites = num(r.favorites) ?? num(r.numFavorers);
      const reviewCount =
        num(r.reviews) ?? num(r.reviewsCount) ?? num(r.numReviews) ?? num(r.ratingCount);

      let est: MonthlyEstimate | undefined;
      if (favourites != null) {
        est = estimateFromProxy({
          proxyCount: favourites,
          priceUsd: price ?? 0,
          basis: "favorites-proxy",
          conversion: PROXY_CONVERSION.favorites,
        });
      } else if (reviewCount != null) {
        est = estimateFromProxy({
          proxyCount: reviewCount,
          priceUsd: price ?? 0,
          basis: "ratings-proxy",
          conversion: PROXY_CONVERSION.ratings,
        });
      }

      signals.push({
        sourcePlatform: "etsy",
        sourceId,
        sourceUrl:    link,
        title,
        priceUsd:     price,
        ratingAvg:    r.rating != null ? Number(r.rating) : undefined,
        ratingCount:  reviewCount,
        estMonthlySales:   est?.sales,
        estMonthlyRevenue: est?.revenue,
        capturedAt:   r.scrapedAt ?? new Date().toISOString(),
        tags: [
          r._keyword,
          "digital-download",
          est ? revenueBasisTag(est.basis) : undefined,
        ].filter((x): x is string => Boolean(x)),
        thumbnailUrl: r.imageUrl ?? undefined,
        creator:      r.shop ? { handle: r.shop, profileUrl: "" } : undefined,
        rawJson:      r as unknown as Record<string, unknown>,
      });
    }

    console.log(`[etsy-apify] normalized ${signals.length} signals`);
    return signals;
  },
};

export default etsy;