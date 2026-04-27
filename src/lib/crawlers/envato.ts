import type { CrawlerModule, RawSignal } from "./types";

interface EnvatoItem {
  id: number;
  name: string;
  description: string;
  site: string;
  classification: string;
  classification_url: string;
  price_cents: number;
  number_of_sales: number;
  author_username: string;
  author_url: string;
  url: string;
  summary: string;
  rating: { rating: number; count: number };
  published_at: string;
  trending: boolean;
  previews: { icon_with_landscape_preview?: { landscape_url: string } };
}

interface EnvatoResponse {
  matches: EnvatoItem[];
}

const envato: CrawlerModule = {
  source: "envato",
  requiresHeadless: false,
  async crawl({ config }) {
    const token = process.env.ENVATO_API_KEY;
    if (!token) throw new Error("ENVATO_API_KEY missing");
    const term = (config.term as string | undefined) ?? "";
    const site = (config.site as string | undefined) ?? "themeforest.net";
    const sortBy = (config.sortBy as string | undefined) ?? "trending";
    const url = `https://api.envato.com/v1/discovery/search/search/item?site=${site}&sort_by=${sortBy}&term=${encodeURIComponent(term)}&page_size=30`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Envato fetch failed: ${res.status}`);
    return (await res.json()) as EnvatoResponse;
  },
  parse(raw: unknown) {
    const r = raw as EnvatoResponse;
    return r.matches ?? [];
  },
  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as EnvatoItem[];
    return items.map((it) => ({
      sourcePlatform: "envato",
      sourceUrl: it.url,
      sourceId: String(it.id),
      title: it.name,
      snippet: it.summary,
      priceUsd: it.price_cents / 100,
      ratingAvg: it.rating.rating,
      ratingCount: it.rating.count,
      tags: [it.classification, it.site],
      thumbnailUrl: it.previews.icon_with_landscape_preview?.landscape_url,
      estMonthlySales: { low: 0, high: it.number_of_sales },
      capturedAt: new Date(it.published_at).toISOString(),
      creator: {
        handle: it.author_username,
        displayName: it.author_username,
        profileUrl: it.author_url,
      },
      rawJson: it as unknown as Record<string, unknown>,
    }));
  },
};

export default envato;
