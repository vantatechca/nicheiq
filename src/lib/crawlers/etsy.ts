import type { CrawlerModule, RawSignal } from "./types";
import { estimateFromProxy, PROXY_CONVERSION, revenueBasisTag } from "./revenue";

const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

const DEFAULT_KEYWORDS = [
  "digital download",
  "notion template",
  "procreate brushes",
  "printable planner",
  "canva template",
  "social media template",
  "lightroom preset",
  "svg cut file",
  "resume template",
  "excel template",
];

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  url: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  num_favorers: number;
  views: number;
  creation_timestamp: number;
  is_digital: boolean;
  images?: Array<{ url_fullxfull: string }>;
  shop?: { shop_name: string; url: string };
}

interface EtsyPage {
  keyword: string;
  results: EtsyListing[];
}

const etsy: CrawlerModule = {
  source: "etsy",
  requiresHeadless: false,

  async crawl({ config }) {
    const apiKey = process.env.ETSY_API_KEY;
    if (!apiKey) throw new Error("ETSY_API_KEY missing");

    const keywords = (config.keywords as string[] | undefined) ?? DEFAULT_KEYWORDS;
    const limit = (config.limit as number | undefined) ?? 50;

    const pages = await Promise.all(
      keywords.map(async (kw): Promise<EtsyPage> => {
        const params = new URLSearchParams({
          keywords: kw,
          limit: String(Math.min(limit, 100)),
          sort_on: "score",
          sort_order: "desc",
        });
        const res = await fetch(`${ETSY_API_BASE}/listings/active?${params}`, {
          headers: { "x-api-key": apiKey },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return { keyword: kw, results: [] };
        const json = await res.json();
        return { keyword: kw, results: json.results ?? [] };
      }),
    );

    return pages;
  },

  parse(raw: unknown) {
    const pages = raw as EtsyPage[];
    return pages.flatMap((p) => p.results.map((r) => ({ ...r, _keyword: p.keyword })));
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as Array<EtsyListing & { _keyword: string }>;
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const l of items) {
      const sourceId = String(l.listing_id);
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      const priceUsd = l.price.amount / l.price.divisor;
      // Etsy's API exposes no sales count, so we proxy demand from favourites —
      // a weak signal, hence low end 0 and a "favorites-proxy" label.
      const est = estimateFromProxy({
        proxyCount: l.num_favorers ?? 0,
        priceUsd,
        basis: "favorites-proxy",
        conversion: PROXY_CONVERSION.favorites,
      });

      signals.push({
        sourcePlatform: "etsy",
        sourceId,
        sourceUrl: l.url,
        title: l.title,
        snippet: l.description?.slice(0, 280) || undefined,
        priceUsd,
        estMonthlySales: est.sales,
        estMonthlyRevenue: est.revenue,
        capturedAt: new Date(l.creation_timestamp * 1000).toISOString(),
        tags: [...(l.tags ?? []).slice(0, 11), revenueBasisTag(est.basis)],
        thumbnailUrl: l.images?.[0]?.url_fullxfull,
        creator: l.shop ? { handle: l.shop.shop_name, profileUrl: l.shop.url } : undefined,
        rawJson: l as unknown as Record<string, unknown>,
      });
    }

    return signals;
  },
};

export default etsy;