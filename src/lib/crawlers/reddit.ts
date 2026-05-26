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

// "hot" = current attention; add "top" (with a time window) via config to catch
// the proven high-demand threads over the last week/month.
const DEFAULT_LISTINGS = ["hot"];

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

interface RedditRow {
  post: RedditPost;
  via: string; // which listing surfaced it (provenance)
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const reddit: CrawlerModule = {
  source: "reddit",
  requiresHeadless: false,

  async crawl({ config }) {
    const subs = (config.subs as string[] | undefined) ?? DEFAULT_SUBS;
    const listings = (config.listings as string[] | undefined) ?? DEFAULT_LISTINGS;
    const limit = (config.limit as number | undefined) ?? 25;
    const topWindow = (config.topWindow as string | undefined) ?? "week"; // hour|day|week|month|year|all
    const delayMs = (config.perRequestDelayMs as number | undefined) ?? 150;
    const maxRequests = (config.maxRequests as number | undefined) ?? 80;

    // Prefer OAuth (100 req/min/account). Fall back to public JSON (~10 req/min/IP)
    // only when credentials aren't configured.
    const token = await getRedditToken();
    const baseHost = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
    const headers: Record<string, string> = { "user-agent": USER_AGENT };
    if (token) headers.authorization = `Bearer ${token}`;

    const combos: Array<{ sub: string; listing: string }> = [];
    for (const sub of subs) for (const listing of listings) combos.push({ sub, listing });
    const capped = combos.slice(0, maxRequests);

    // Sequential with a small gap — safe for both the OAuth and (gentler)
    // public-JSON paths, and a per-request try/catch keeps one bad sub from
    // sinking the whole crawl.
    const rows: RedditRow[] = [];
    for (const { sub, listing } of capped) {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (listing === "top") qs.set("t", topWindow);
      try {
        const res = await fetch(`${baseHost}/r/${sub}/${listing}.json?${qs}`, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { children?: RedditPost[] } };
          for (const p of json.data?.children ?? []) rows.push({ post: p, via: listing });
        }
      } catch {
        // network/timeout on one sub — skip and continue
      }
      await sleep(delayMs);
    }

    return rows;
  },

  parse(raw: unknown) {
    return raw as RedditRow[];
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const rows = parsed as RedditRow[];
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const { post: p, via } of rows) {
      const d = p.data;
      if (seen.has(d.id)) continue; // same post can appear in hot AND top
      seen.add(d.id);

      signals.push({
        sourcePlatform: "reddit",
        sourceUrl: `https://reddit.com${d.permalink}`,
        sourceId: d.id,
        title: d.title,
        snippet: (d.selftext ?? "").slice(0, 280),
        capturedAt: new Date(d.created_utc * 1000).toISOString(),
        // upvotes + comments are the demand signal — keep them queryable.
        tags: [d.subreddit, `via:${via}`, `score:${d.score}`, `comments:${d.num_comments}`],
        rawJson: d as unknown as Record<string, unknown>,
      });
    }

    return signals;
  },
};

export default reddit;