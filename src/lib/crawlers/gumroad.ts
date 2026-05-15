import type { CrawlerModule, RawSignal } from "./types";

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

interface GumroadProduct {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  url: string;
  preview_url: string | null;
  seller_name: string;
  rating_count: number;
  rating_average: number | null;
  tags: string[];
  _query: string;
}

interface GumroadResponse {
  products: GumroadProduct[];
  total: number;
}

const gumroad: CrawlerModule = {
  source: "gumroad",
  requiresHeadless: false,

  async crawl({ config }) {
    const queries = (config.queries as string[] | undefined) ?? DIGITAL_QUERIES;
    const count = (config.count as number | undefined) ?? 12;

    const results: GumroadProduct[] = [];

    for (const query of queries) {
      try {
        const params = new URLSearchParams({
          query,
          from: "0",
          count: String(count),
          sort: "featured",
        });

        const res = await fetch(`https://gumroad.com/discover_search?${params}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; nicheiq-bot/0.1)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          console.warn(`[gumroad] ${query} → ${res.status}`);
          continue;
        }

        const json = (await res.json()) as GumroadResponse;
        const tagged = (json.products ?? []).map((p) => ({ ...p, _query: query }));
        results.push(...tagged);

        // Be polite — 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.warn(`[gumroad] fetch failed for "${query}":`, e);
      }
    }

    return results;
  },

  parse(raw: unknown) {
    return raw as GumroadProduct[];
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as GumroadProduct[];
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const p of items) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);

      // Filter: skip anything over $500 (likely not a simple digital product)
      const priceUsd = p.price / 100;
      if (priceUsd > 500) continue;

      signals.push({
        sourcePlatform: "gumroad",
        sourceId: p.id,
        sourceUrl: p.url,
        title: p.name,
        snippet: p.description?.slice(0, 280) || undefined,
        priceUsd,
        capturedAt: new Date().toISOString(),
        tags: (p.tags ?? []).concat(p._query).slice(0, 12),
        thumbnailUrl: p.preview_url ?? undefined,
        creator: {
          handle: p.seller_name,
          profileUrl: `https://gumroad.com/${p.seller_name}`,
        },
        rawJson: p as unknown as Record<string, unknown>,
      });
    }

    return signals;
  },
};

export default gumroad;
