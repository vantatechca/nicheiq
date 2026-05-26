import type { CrawlerModule, RawSignal } from "./types";

const PH_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

// RANKING surfaces what's climbing now; pairing it with a lookback window gives
// recent momentum rather than all-time leaders. Add "VOTES" / "NEWEST" via config.
const DEFAULT_ORDERS = ["RANKING"];
const DEFAULT_LOOKBACK_DAYS = 14;

interface PhPost {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  url: string;
  topics: { edges: { node: { name: string } }[] };
  user: { username: string; name: string };
}

interface PhConnection {
  pageInfo: { endCursor: string | null; hasNextPage: boolean };
  edges: { node: PhPost }[];
}

interface PhResponse {
  data?: { posts: PhConnection };
  errors?: { message: string }[];
}

interface PhRow {
  post: PhPost;
  via: string; // which order surfaced it (provenance)
}

const QUERY = `
  query Disco($first: Int!, $after: String, $postedAfter: DateTime, $order: PostsOrder!) {
    posts(first: $first, after: $after, postedAfter: $postedAfter, order: $order) {
      pageInfo { endCursor hasNextPage }
      edges { node {
        id name tagline slug votesCount commentsCount createdAt url
        topics(first: 5) { edges { node { name } } }
        user { username name }
      } }
    }
  }
`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const productHunt: CrawlerModule = {
  source: "product_hunt",
  requiresHeadless: false,

  async crawl({ config }) {
    const token = process.env.PRODUCT_HUNT_TOKEN;
    if (!token) throw new Error("PRODUCT_HUNT_TOKEN missing");

    const orders = (config.orders as string[] | undefined) ?? DEFAULT_ORDERS;
    // Honour pageSize, then the legacy `limit`, capped at the API max.
    const first = Math.min(
      (config.pageSize as number | undefined) ?? (config.limit as number | undefined) ?? 20,
      50,
    );
    const pages = Math.max((config.pages as number | undefined) ?? 2, 1);
    // Honour lookbackDays, then the cron's original `daysBack`.
    const lookbackDays =
      (config.lookbackDays as number | undefined) ??
      (config.daysBack as number | undefined) ??
      DEFAULT_LOOKBACK_DAYS;
    const delayMs = (config.perRequestDelayMs as number | undefined) ?? 350;
    const postedAfter = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

    const rows: PhRow[] = [];

    // Paginate each order via the GraphQL cursor, capped by `pages`.
    for (const order of orders) {
      let after: string | null = null;
      for (let page = 0; page < pages; page++) {
        const res = await fetch(PH_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ query: QUERY, variables: { first, after, postedAfter, order } }),
          signal: AbortSignal.timeout(15_000),
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error(`Product Hunt auth failed (${res.status}) — check PRODUCT_HUNT_TOKEN`);
        }
        if (!res.ok) break; // transient: stop paginating this order, keep what we have

        // GraphQL returns 200 + { errors } on rate limits / bad queries.
        const json = (await res.json()) as PhResponse;
        if (json.errors?.length) {
          throw new Error(`Product Hunt GraphQL error: ${json.errors[0]!.message}`);
        }

        const conn = json.data?.posts;
        if (!conn) break;
        for (const e of conn.edges) rows.push({ post: e.node, via: order });

        if (!conn.pageInfo.hasNextPage || !conn.pageInfo.endCursor) break;
        after = conn.pageInfo.endCursor;
        await sleep(delayMs);
      }
      await sleep(delayMs);
    }

    return rows;
  },

  parse(raw: unknown) {
    return raw as PhRow[];
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const rows = parsed as PhRow[];
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const { post: p, via } of rows) {
      if (seen.has(p.id)) continue; // dedupe across orders/pages
      seen.add(p.id);

      const topics = p.topics.edges.map((e) => e.node.name);
      signals.push({
        sourcePlatform: "product_hunt",
        sourceUrl: p.url,
        sourceId: p.id,
        title: p.name,
        snippet: p.tagline,
        // Votes & comments are PH's demand signal. RawSignal has no metric
        // field, so surface them as queryable tags (they stay in rawJson too).
        tags: [...topics, `via:${via}`, `votes:${p.votesCount}`, `comments:${p.commentsCount}`],
        capturedAt: p.createdAt,
        creator: {
          handle: p.user.username,
          displayName: p.user.name,
          profileUrl: `https://producthunt.com/@${p.user.username}`,
        },
        rawJson: p as unknown as Record<string, unknown>,
      });
    }

    return signals;
  },
};

export default productHunt;