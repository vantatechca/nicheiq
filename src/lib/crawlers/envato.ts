import type { CrawlerModule, RawSignal } from "./types";
import { estimateFromSales, revenueBasisTag } from "./revenue";

const SEARCH_ENDPOINT = "https://api.envato.com/v1/discovery/search/search/item";

// Envato runs several marketplaces. For *digital-product* discovery the
// design-asset sites carry the most signal; the media sites are opt-in.
//   graphicriver.net — templates, print, presentation, social, fonts, add-ons
//   themeforest.net  — site & marketing templates
//   codecanyon.net   — plugins & scripts
//   photodune / videohive / audiojungle / 3docean — stock media
// All three design-asset sites are defaults so the scheduled cron (which passes
// no `sites`) crawls the same marketplaces the live test proved out.
const DEFAULT_SITES = ["graphicriver.net", "themeforest.net", "codecanyon.net"];

// "trending" = rising right now, "sales" = proven lifetime winners. Pulling
// both gives the dashboard a hot/established pair per site.
const DEFAULT_SORTS = ["trending", "sales"];

// An empty term browses the whole site for the chosen sort — ideal for broad
// discovery. Pass real terms in config to drill into a sub-niche.
const DEFAULT_TERMS: string[] = [""];

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
  previews: Record<
    string,
    { landscape_url?: string; thumbnail_url?: string; icon_url?: string } | undefined
  >;
}

interface EnvatoSearchResponse {
  matches?: EnvatoItem[];
}

interface ComboResult {
  items: EnvatoItem[];
  via: string; // which sort surfaced these (kept for provenance tagging)
}

// Envato returns different preview shapes per site/category. Try the richest
// landscape image first, then fall back through thumbnail/icon variants.
function pickThumbnail(previews: EnvatoItem["previews"]): string | undefined {
  if (!previews) return undefined;
  const order = [
    "icon_with_landscape_preview",
    "landscape_preview",
    "icon_with_thumbnail_preview",
    "icon_preview",
  ];
  for (const key of order) {
    const p = previews[key];
    const url = p?.landscape_url ?? p?.thumbnail_url ?? p?.icon_url;
    if (url) return url;
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const envato: CrawlerModule = {
  source: "envato",
  requiresHeadless: false,

  async crawl({ config }) {
    const token = process.env.ENVATO_API_KEY;
    if (!token) throw new Error("ENVATO_API_KEY missing");

    // Accept the expanded plural keys (sites/sorts/terms) AND the original
    // singular keys (site/sortBy/term) that existing callers — the cron and the
    // live test — still pass, so neither path silently falls back to defaults.
    const sites =
      (config.sites as string[] | undefined) ??
      (config.site ? [config.site as string] : DEFAULT_SITES);
    const sorts =
      (config.sorts as string[] | undefined) ??
      (config.sortBy ? [config.sortBy as string] : DEFAULT_SORTS);
    const terms =
      (config.terms as string[] | undefined) ??
      (config.term != null ? [config.term as string] : DEFAULT_TERMS);
    // 30 is the discovery-search page max; honour pageSize, then legacy `limit`,
    // then the proven default.
    const pageSize = Math.min(
      (config.pageSize as number | undefined) ?? (config.limit as number | undefined) ?? 30,
      30,
    );
    const pages = Math.max((config.pages as number | undefined) ?? 1, 1);
    const delayMs = (config.perRequestDelayMs as number | undefined) ?? 250;
    const maxCombos = (config.maxCombos as number | undefined) ?? 16;

    // Build the (site × sort × term × page) matrix, capped so a wide config
    // can't accidentally blow past Envato's rate limit.
    const combos: Array<{ site: string; sortBy: string; term: string; page: number }> = [];
    for (const site of sites)
      for (const sortBy of sorts)
        for (const term of terms)
          for (let page = 1; page <= pages; page++) combos.push({ site, sortBy, term, page });
    const capped = combos.slice(0, maxCombos);

    // Sequential with a small gap — friendlier to the rate limit than a burst
    // of parallel requests, and fine for a cron-driven crawl.
    const results: ComboResult[] = [];
    for (const c of capped) {
      const params = new URLSearchParams({
        site: c.site,
        sort_by: c.sortBy,
        term: c.term,
        page: String(c.page),
        page_size: String(pageSize),
      });

      let res: Response;
      try {
        res = await fetch(`${SEARCH_ENDPOINT}?${params}`, {
          headers: { authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        await sleep(delayMs);
        continue; // a network/timeout on one combo shouldn't sink the crawl
      }

      // A bad or lapsed token fails every combo identically — surface it loudly
      // rather than silently returning nothing.
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Envato auth failed (${res.status}) — check ENVATO_API_KEY`);
      }
      if (res.ok) {
        const json = (await res.json()) as EnvatoSearchResponse;
        results.push({ items: json.matches ?? [], via: c.sortBy });
      }
      await sleep(delayMs);
    }

    return results;
  },

  parse(raw: unknown) {
    const results = raw as ComboResult[];
    // Flatten, keeping the provenance (which sort surfaced each item).
    return results.flatMap((r) => r.items.map((it) => ({ item: it, via: r.via })));
  },

  normalize(parsed: unknown[]): RawSignal[] {
    const rows = parsed as Array<{ item: EnvatoItem; via: string }>;
    const seen = new Set<string>();
    const signals: RawSignal[] = [];

    for (const { item: it, via } of rows) {
      const sourceId = String(it.id);
      if (seen.has(sourceId)) continue; // dedupe: an item can hit both sorts
      seen.add(sourceId);

      const priceUsd = it.price_cents / 100;
      // number_of_sales is a REAL lifetime total (unlike Etsy's favourites),
      // so this yields a proper sales-derived monthly estimate.
      const est = estimateFromSales({
        totalSales: it.number_of_sales,
        publishedAtIso: it.published_at,
        priceUsd,
      });

      signals.push({
        sourcePlatform: "envato",
        sourceUrl: it.url,
        sourceId,
        title: it.name,
        snippet: it.summary,
        priceUsd,
        ratingAvg: it.rating?.rating,
        ratingCount: it.rating?.count,
        tags: [
          it.classification,
          it.site,
          `via:${via}`,
          ...(it.trending ? ["trending"] : []),
          revenueBasisTag(est.basis),
        ].filter(Boolean) as string[],
        thumbnailUrl: pickThumbnail(it.previews),
        estMonthlySales: est.sales,
        estMonthlyRevenue: est.revenue,
        capturedAt: new Date().toISOString(), // crawl time, not publish time
        creator: {
          handle: it.author_username,
          displayName: it.author_username,
          profileUrl: it.author_url,
        },
        rawJson: it as unknown as Record<string, unknown>,
      });
    }

    return signals;
  },
};

export default envato;