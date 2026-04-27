import type { CrawlerModule, RawSignal } from "./types";

interface HnItem {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants?: number;
  time: number;
  type: string;
}

const hackerNews: CrawlerModule = {
  source: "hacker_news",
  requiresHeadless: false,
  async crawl({ config }) {
    const which = (config.list as string | undefined) ?? "showstories";
    const limit = (config.limit as number | undefined) ?? 30;
    const idsRes = await fetch(`https://hacker-news.firebaseio.com/v0/${which}.json`);
    if (!idsRes.ok) throw new Error(`HN ${which} fetch failed: ${idsRes.status}`);
    const ids = (await idsRes.json()) as number[];
    const slice = ids.slice(0, limit);
    const items = await Promise.all(
      slice.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return r.ok ? ((await r.json()) as HnItem) : null;
      }),
    );
    return items.filter(Boolean) as HnItem[];
  },
  parse(raw: unknown) {
    return raw as HnItem[];
  },
  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as HnItem[];
    return items.map((it) => ({
      sourcePlatform: "hacker_news",
      sourceUrl: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
      sourceId: String(it.id),
      title: it.title,
      snippet: it.text?.slice(0, 280),
      capturedAt: new Date(it.time * 1000).toISOString(),
      creator: { handle: it.by, displayName: it.by, profileUrl: `https://news.ycombinator.com/user?id=${it.by}` },
      rawJson: it as unknown as Record<string, unknown>,
    }));
  },
};

export default hackerNews;
