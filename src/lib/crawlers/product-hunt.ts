import type { CrawlerModule, RawSignal } from "./types";

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

interface PhResponse {
  data: { posts: { edges: { node: PhPost }[] } };
}

const productHunt: CrawlerModule = {
  source: "product_hunt",
  requiresHeadless: false,
  async crawl({ config }) {
    const token = process.env.PRODUCT_HUNT_TOKEN;
    if (!token) throw new Error("PRODUCT_HUNT_TOKEN missing");
    const limit = (config.limit as number | undefined) ?? 20;
    const query = `
      query TopPosts($first: Int!) {
        posts(order: VOTES, first: $first) {
          edges { node {
            id name tagline slug votesCount commentsCount createdAt url
            topics(first: 5) { edges { node { name } } }
            user { username name }
          } }
        }
      }
    `;
    const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { first: limit } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Product Hunt fetch failed: ${res.status}`);
    const json = (await res.json()) as PhResponse & { errors?: { message: string }[] };
    // GraphQL APIs return 200 OK with { errors: [...] } on rate limits, invalid
    // queries, or expired tokens. Surface the real error instead of letting
    // the parse step crash with "Cannot read properties of undefined".
    if (json.errors?.length) {
      throw new Error(`Product Hunt GraphQL error: ${json.errors[0]!.message}`);
    }
    return json;
  },
  parse(raw: unknown) {
    const r = raw as PhResponse;
    return r.data.posts.edges.map((e) => e.node);
  },
  normalize(parsed: unknown[]): RawSignal[] {
    const posts = parsed as PhPost[];
    return posts.map((p) => ({
      sourcePlatform: "product_hunt",
      sourceUrl: p.url,
      sourceId: p.id,
      title: p.name,
      snippet: p.tagline,
      tags: p.topics.edges.map((e) => e.node.name),
      capturedAt: p.createdAt,
      creator: {
        handle: p.user.username,
        displayName: p.user.name,
        profileUrl: `https://producthunt.com/@${p.user.username}`,
      },
      rawJson: p as unknown as Record<string, unknown>,
    }));
  },
};

export default productHunt;
