import type { CrawlerModule, RawSignal } from "./types";

const DEFAULT_SUBS = [
  // Existing good ones
  "Entrepreneur",
  "SideProject",
  "passive_income",
  // Digital product specific
  "Notion",
  "NotionTemplates",
  "EtsySellers",
  "Etsy",
  "KDP",
  "selfpublishing",
  "NoCode",
  "nocode",
  "microsaas",
  "SaaS",
  "ChatGPT",
  "MidJourney",
  "AIPromptEngineering",
  "gamedev",
  "gamedesign",
  "discordapp",
  "WordpressPlugins",
  "shopify",
  "lightroom",
  "VideoEditing",
  "datasets",
];

const USER_AGENT = "nicheiq-bot/0.1 (research; contact andrei@nicheiq.com)";

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

// Cached OAuth token. Reddit client-credentials tokens last ~1 hour.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

const reddit: CrawlerModule = {
  source: "reddit",
  requiresHeadless: false,
  async crawl({ config }) {
    const subs = (config.subs as string[] | undefined) ?? DEFAULT_SUBS;
    const limit = (config.limit as number | undefined) ?? 25;

    // Prefer OAuth (100 req/min/account). Fall back to public JSON (~10 req/min/IP)
    // only when credentials aren't configured — public JSON is heavily rate-limited.
    const token = await getRedditToken();
    const baseHost = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
    const headers: Record<string, string> = { "user-agent": USER_AGENT };
    if (token) headers.authorization = `Bearer ${token}`;

    const results = await Promise.all(
      subs.map(async (sub) => {
        const res = await fetch(`${baseHost}/r/${sub}/hot.json?limit=${limit}`, {
          headers,
          signal: AbortSignal.timeout(10_000),
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
