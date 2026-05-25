/**
 * POPULATE Database 1 — live Envato crawl → persist.
 *
 * Envato has a real, documented marketplace search API that returns actual
 * lifetime sales counts, so revenue here is "sales-derived" — the most accurate
 * basis — rather than the rating/favorite proxies other sources fall back to.
 * Runs the same crawl → parse → normalize → persistSignals chain the Inngest
 * cron uses, writing product_from_signal_envato_* rows (market products) into
 * the products table.
 *
 * OPT-IN: skipped unless RUN_LIVE_CRAWL=1, DATABASE_URL, and ENVATO_API_KEY are
 * all set, so it never runs in `npm test` or CI.
 *
 * ⚠ It WRITES to whatever DATABASE_URL points at. Envato rows are real data you
 * want (not throwaway test rows), so prod is defensible — or use a dev branch
 * for a first validation run.
 *
 * Get the key (no cost): build.envato.com → Create a Token → check
 * "View and search Envato sites" → copy it. Then (PowerShell):
 *
 *   $env:RUN_LIVE_CRAWL=1; `
 *   $env:ENVATO_API_KEY="your_token"; `
 *   $env:DATABASE_URL="postgresql://…your-target…"; `
 *     npx vitest run src/inngest/functions/__tests__/populate-products-envato.live.test.ts
 *
 * Optional:
 *   $env:ENVATO_SITES="graphicriver.net,themeforest.net,codecanyon.net"
 *   $env:OPENROUTER_API_KEY="…"   real niche classification (else → "other")
 */
import { describe, it, expect } from "vitest";
import envato from "@/lib/crawlers/envato";
import type { RawSignal } from "@/lib/crawlers/types";
import { persistSignals } from "../_persist-signals";

const ENABLED =
  process.env.RUN_LIVE_CRAWL === "1" && !!process.env.DATABASE_URL && !!process.env.ENVATO_API_KEY;

// Each Envato "site" is a marketplace. These three give a useful spread:
// graphics/print, web templates, and code/scripts (the closest to micro-SaaS).
const SITES = process.env.ENVATO_SITES
  ? process.env.ENVATO_SITES.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["graphicriver.net", "themeforest.net", "codecanyon.net"];

describe.skipIf(!ENABLED)("populate products (live Envato crawl → persist)", () => {
  it("crawls Envato marketplaces and writes real products into the database", async () => {
    const all: RawSignal[] = [];
    for (const site of SITES) {
      const raw = await envato.crawl({ config: { site, sortBy: "trending" } });
      const parsed = envato.parse(raw);
      const signals = envato.normalize(parsed);
      // eslint-disable-next-line no-console
      console.log(`[populate] ${site}: ${signals.length} items`);
      all.push(...signals);
      // Be polite between marketplaces.
      await new Promise((r) => setTimeout(r, 500));
    }

    // eslint-disable-next-line no-console
    console.log(`[populate] crawled ${all.length} Envato products across ${SITES.length} sites`);

    const saved = await persistSignals(all);
    // eslint-disable-next-line no-console
    console.log(
      `[populate] persisted ${saved} → products table as product_from_signal_envato_* (market products).\n` +
        `Check: SELECT count(*) FROM products WHERE id LIKE 'product_from_signal_envato_%';\n` +
        `Then open /products → Market view, or hit "Export winners".`,
    );

    // 0 here means the API rejected the request — almost always a missing
    // "View and search Envato sites" permission on the token, or a bad key.
    expect(all.length).toBeGreaterThan(0);
  }, 120_000);
});