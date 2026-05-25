/**
 * POPULATE Database 1 — live Gumroad crawl → persist.
 *
 * This is how you fill the products table the first time. It runs the exact
 * same chain the Inngest cron runs (crawl → parse → normalize → persistSignals),
 * so the rows it writes are identical to a production crawl:
 * product_from_signal_gumroad_* in the products table, opportunity_id NULL
 * (i.e. "market" products), with first/last-seen and a ratings-proxy revenue
 * estimate.
 *
 * OPT-IN: skipped unless RUN_LIVE_CRAWL=1 AND DATABASE_URL is set, so it never
 * runs in `npm test` or CI.
 *
 * ⚠ It WRITES to whatever DATABASE_URL points at — POINT IT AT A DEV BRANCH,
 * not production.
 *
 * Run it (PowerShell):
 *   $env:RUN_LIVE_CRAWL=1; $env:DATABASE_URL="postgres://…dev-branch…"; `
 *     npx vitest run src/inngest/functions/__tests__/populate-products.live.test.ts
 *
 * Optional:
 *   $env:OPENROUTER_API_KEY="…"   real niche classification (else → "other")
 *   $env:LIVE_QUERIES="notion template,budget tracker"   (comma-separated)
 *   $env:LIVE_COUNT=12                                   (results per query)
 *
 * Gumroad needs no API key — its discover endpoint is public.
 */
import { describe, it, expect } from "vitest";
import gumroad from "@/lib/crawlers/gumroad";
import { persistSignals } from "../_persist-signals";

const ENABLED = process.env.RUN_LIVE_CRAWL === "1" && !!process.env.DATABASE_URL;

const QUERIES = process.env.LIVE_QUERIES
  ? process.env.LIVE_QUERIES.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [
      "notion template",
      "budget tracker",
      "resume template",
      "canva template",
      "prompt pack",
      "social media template",
    ];
const COUNT = Number(process.env.LIVE_COUNT) || 12;

describe.skipIf(!ENABLED)("populate products (live Gumroad crawl → persist)", () => {
  it("crawls Gumroad and writes real products into the database", async () => {
    const raw = await gumroad.crawl({ config: { queries: QUERIES, count: COUNT } });
    const parsed = gumroad.parse(raw);
    const signals = gumroad.normalize(parsed);

    // eslint-disable-next-line no-console
    console.log(
      `[populate] crawled ${signals.length} Gumroad products across ${QUERIES.length} queries`,
    );

    const saved = await persistSignals(signals);

    // eslint-disable-next-line no-console
    console.log(
      `[populate] persisted ${saved} → products table as product_from_signal_gumroad_* (market products).\n` +
        `Check them: SELECT count(*) FROM products WHERE id LIKE 'product_from_signal_gumroad_%';\n` +
        `Or open /products → Market view, or hit "Export winners".`,
    );

    // If Gumroad's unofficial endpoint blocked us, signals will be 0 — that's
    // an endpoint/UA issue, not the pipeline. Surface it loudly.
    expect(signals.length).toBeGreaterThan(0);
  }, 120_000); // real network across several queries + 500ms politeness delay each
});