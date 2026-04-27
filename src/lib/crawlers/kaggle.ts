import type { CrawlerModule, RawSignal } from "./types";

interface KaggleDataset {
  ref: string;
  title: string;
  subtitle: string;
  url: string;
  ownerUser: string;
  ownerRef: string;
  totalBytes: number;
  totalDownloads: number;
  totalViews: number;
  totalVotes: number;
  licenseName: string;
  description?: string;
  lastUpdated: string;
  tags?: { name: string }[];
}

const kaggle: CrawlerModule = {
  source: "kaggle",
  requiresHeadless: false,
  async crawl({ config }) {
    const username = process.env.KAGGLE_USERNAME;
    const key = process.env.KAGGLE_KEY;
    if (!username || !key) throw new Error("KAGGLE_USERNAME/KAGGLE_KEY missing");
    const sortBy = (config.sortBy as string | undefined) ?? "votes";
    const search = (config.search as string | undefined) ?? "";
    const url = `https://www.kaggle.com/api/v1/datasets/list?sortBy=${sortBy}&search=${encodeURIComponent(search)}`;
    const auth = "Basic " + Buffer.from(`${username}:${key}`).toString("base64");
    const res = await fetch(url, { headers: { authorization: auth } });
    if (!res.ok) throw new Error(`Kaggle fetch failed: ${res.status}`);
    return (await res.json()) as KaggleDataset[];
  },
  parse(raw: unknown) {
    return raw as KaggleDataset[];
  },
  normalize(parsed: unknown[]): RawSignal[] {
    const items = parsed as KaggleDataset[];
    return items.map((d) => ({
      sourcePlatform: "kaggle",
      sourceUrl: `https://kaggle.com/datasets/${d.ref}`,
      sourceId: d.ref,
      title: d.title,
      snippet: d.subtitle ?? d.description?.slice(0, 280),
      tags: d.tags?.map((t) => t.name) ?? [],
      capturedAt: d.lastUpdated,
      creator: {
        handle: d.ownerRef,
        displayName: d.ownerUser,
        profileUrl: `https://kaggle.com/${d.ownerRef}`,
      },
      rawJson: d as unknown as Record<string, unknown>,
    }));
  },
};

export default kaggle;
