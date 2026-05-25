import { describe, it, expect } from "vitest";
import { rollupCreators } from "@/lib/creators/rollup";

/**
 * Opt-in live harness — populates the `creators` table by rolling up the
 * crawled products already in the database. Run after a product crawl:
 *
 *   $env:RUN_LIVE_CRAWL=1; npx vitest run rollup-creators
 *
 * Idempotent: safe to re-run; it refreshes counts/revenue/niches in place.
 * Skipped in normal/CI runs (no RUN_LIVE_CRAWL).
 */
const LIVE = process.env.RUN_LIVE_CRAWL === "1";

describe.skipIf(!LIVE)("creator roll-up (live)", () => {
  it("rolls crawled products up into the creators table", async () => {
    const res = await rollupCreators();
    console.log(
      `[rollup-creators] upserted ${res.creators} creators from ${res.fromProducts} products.`,
    );
    console.log("Check: SELECT count(*) FROM creators WHERE id LIKE 'creator_from_product_%';");
    console.log('Then open /creators, or hit "Export workbook".');
    expect(res.creators).toBeGreaterThan(0);
  });
});