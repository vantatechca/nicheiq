import type { CrawlerModule, RawSignal } from "./types";

const DEFAULT_SUBS = [
  "Entrepreneur",
  "SideProject",
  "passive_income",
  "Etsy",
  "EtsySellers",
  "digitalmarketing",
  "Notion",
  "GraphicDesign",
  "InternetIsBeautiful",
];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    permalink: string;
    score: number;
    num_comments: number;
    subreddit: string;
    created_utc: number;
    url: string;
  };
}

const reddit: CrawlerModule = {
  source: "reddit",
  requiresHeadless: false,
  async crawl({ config }) {
    const subs = (config.subs as string[] | undefined) ?? DEFAULT_SUBS;
    const limit = (config.limit as number | undefined) ?? 25;
    const results = await Promise.all(
      subs.map(async (sub) => {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`, {
          headers: { "user-agent": "nicheiq-bot/0.1 (research; contact andrei@nicheiq.com)" },
        });
        if (!res.ok) return { sub, posts: [] };
        const json = (await res.json()) as { data: { children: RedditPost[] } };
        return { sub, posts: json.data.children };
      }),
    );
    return results;
  },
  parse(raw: unknown) {
    const groups = raw as { sub: string; posts: RedditPost[] }[];
    return groups.flatMap((g) => g.posts);
  },
  normalize(parsed: unknown[]): RawSignal[] {
    const posts = parsed as RedditPost[];
    return posts.map((p) => ({
      sourcePlatform: "reddit",
      sourceUrl: `https://reddit.com${p.data.permalink}`,
      sourceId: p.data.id,
      title: p.data.title,
      snippet: p.data.selftext.slice(0, 280),
      capturedAt: new Date(p.data.created_utc * 1000).toISOString(),
      tags: [p.data.subreddit],
      rawJson: p.data as unknown as Record<string, unknown>,
    }));
  },
};

export default reddit;
