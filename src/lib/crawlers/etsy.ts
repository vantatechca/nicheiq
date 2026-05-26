import type { CrawlerModule, RawSignal } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID   = "automation-lab~etsy-scraper";

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

// Output shape from automation-lab~etsy-scraper
interface ApifyEtsyItem {
  listingId?:     string | number;
  name?:          string;
  url?:           string;
  price?:         string | number;
  originalPrice?: string | null;
  currency?:      string;
  imageUrl?:      string;
  shop?:          string;
  shopId?:        string;
  rating?:        number | null;
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

const etsy: CrawlerModule = {
  source: "etsy",
  requiresHeadless: false,

  async crawl({ config }) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error("APIFY_TOKEN missing — add it to .env.local");

    const keywords = (config.keywords as string[] | undefined) ?? DEFAULT_KEYWORDS;
    const limit    = (config.limit   as number | undefined)    ?? 50;

    const pages = await Promise.all(
      keywords.map(async (kw): Promise<EtsyPage> => {
        const input = {
          searchQuery: kw,
          maxItems:    Math.min(limit, 100),
          sort:        "most_relevant",
          category:    "craft-supplies-and-tools",
        };

        const url =
          `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items` +
          `?token=${token}&timeout=120&memory=512`;

        console.log(`[etsy-apify] running actor for: "${kw}"`);

        const res = await fetch(url, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(input),
          signal:  AbortSignal.timeout(130_000),
        });

        if (!res.ok) {
          console.warn(`[etsy-apify] HTTP ${res.status} for "${kw}"`);
          return { keyword: kw, items: [] };
        }

        const items = (await res.json()) as ApifyEtsyItem[];
        console.log(`[etsy-apify] got ${items.length} items for "${kw}"`);
        return { keyword: kw, items };
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

      const listingIdMatch = r.url?.match(/\/listing\/(\d+)/);
      const sourceId =
        r.listingId != null ? String(r.listingId) :
        listingIdMatch?.[1]  ?? r.url;

      if (!sourceId || !r.url || !r.name) continue;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      signals.push({
        sourcePlatform: "etsy",
        sourceId,
        sourceUrl:    r.url,
        title:        r.name,
        priceUsd:     parsePrice(r.price),
        ratingAvg:    r.rating != null ? Number(r.rating) : undefined,
        capturedAt:   r.scrapedAt ?? new Date().toISOString(),
        tags: [r._keyword, "digital-download"].filter((x): x is string => Boolean(x)),
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