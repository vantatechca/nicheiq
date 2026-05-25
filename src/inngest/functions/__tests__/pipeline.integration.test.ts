/**
 * Integration test for the crawl → persist pipeline.
 *
 * OPT-IN: skipped unless RUN_DB_TESTS=1 AND DATABASE_URL is set, so it never
 * runs during a normal `npm test` or in CI (which has no DATABASE_URL).
 *
 * It WRITES to whatever DATABASE_URL points at — POINT IT AT A DEV BRANCH, not
 * production. All rows it creates carry "smoketest" in their source URL/id and
 * are deleted in afterAll.
 *
 * Run it:
 *   RUN_DB_TESTS=1 DATABASE_URL="postgres://…" \
 *     npx vitest run src/inngest/functions/__tests__/pipeline.integration.test.ts
 *
 * Note: persistSignals classifies niches via the Tier-1 model. With no
 * OPENROUTER_API_KEY it falls back to a keyword map (niche → "other"), which is
 * fine here — this test asserts routing and timestamps, not niche accuracy.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, like } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products, signals } from "@/lib/db/schema";
import type { RawSignal } from "@/lib/crawlers/types";
import { persistSignals } from "../_persist-signals";

const ENABLED = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
const STAMP = `smoketest_${Date.now()}`;
const ENVATO_URL = `https://example.com/${STAMP}/envato`;
const GUMROAD_URL = `https://example.com/${STAMP}/gumroad`;
const REDDIT_URL = `https://reddit.com/${STAMP}/post`;
const REDDIT_SOURCE_ID = `${STAMP}_reddit`;

// Synthetic *normalized* signals (what a crawler's normalize() emits).
function marketplaceSignal(
  platform: "envato" | "gumroad",
  url: string,
  revHigh: number,
): RawSignal {
  return {
    sourcePlatform: platform,
    sourceUrl: url,
    sourceId: `${STAMP}_${platform}`,
    title: `${platform} smoke product`,
    snippet: "test",
    priceUsd: 20,
    ratingAvg: 4.8,
    ratingCount: 120,
    estMonthlySales: { low: 0, high: Math.round(revHigh / 20) },
    estMonthlyRevenue: { low: 0, high: revHigh },
    tags: ["test", platform === "envato" ? "rev:sales-derived" : "rev:ratings-proxy"],
    rawJson: { smoke: true },
    capturedAt: new Date().toISOString(),
  };
}

function redditSignal(): RawSignal {
  return {
    sourcePlatform: "reddit",
    sourceUrl: REDDIT_URL,
    sourceId: REDDIT_SOURCE_ID,
    title: "reddit smoke discussion",
    snippet: "test",
    tags: ["SideProject"],
    rawJson: { smoke: true, score: 42 },
    capturedAt: new Date().toISOString(),
  };
}

describe.skipIf(!ENABLED)("crawl → persist pipeline (integration)", () => {
  // getDb() is deferred into beforeAll: a skipped describe still runs its body
  // during collection, so calling getDb() at the top level would throw when
  // DATABASE_URL is absent. beforeAll does NOT run for a skipped suite.
  let db: ReturnType<typeof getDb>;
  beforeAll(() => {
    db = getDb();
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(products).where(like(products.sourceUrl, `%${STAMP}%`));
    await db.delete(signals).where(like(signals.sourceUrl, `%${STAMP}%`));
  });

  it("routes marketplace listings to products and discussion to signals", async () => {
    await persistSignals([
      marketplaceSignal("envato", ENVATO_URL, 3000),
      marketplaceSignal("gumroad", GUMROAD_URL, 1500),
      redditSignal(),
    ]);

    const prodRows = await db
      .select()
      .from(products)
      .where(like(products.sourceUrl, `%${STAMP}%`));
    const sigRows = await db
      .select()
      .from(signals)
      .where(like(signals.sourceUrl, `%${STAMP}%`));

    expect(prodRows).toHaveLength(2); // envato + gumroad
    expect(sigRows).toHaveLength(1); // reddit
    expect(sigRows[0]!.sourcePlatform).toBe("reddit");

    const envato = prodRows.find((p) => p.sourcePlatform === "envato")!;
    expect(envato.estMonthlyRevenueHigh).toBe(3000);
    expect(envato.tags).toContain("rev:sales-derived");
    expect(envato.opportunityId).toBeNull(); // market product, not a launch
  });

  it("preserves first_seen on re-crawl while advancing last_seen", async () => {
    const beforeProd = (
      await db.select().from(products).where(eq(products.sourceUrl, ENVATO_URL))
    )[0]!;
    const beforeSig = (
      await db.select().from(signals).where(eq(signals.sourceId, REDDIT_SOURCE_ID))
    )[0]!;

    // Wait a tick so a timestamp change is detectable, then re-crawl with a
    // CHANGED revenue to prove the volatile field updates on conflict.
    await new Promise((r) => setTimeout(r, 1100));
    await persistSignals([marketplaceSignal("envato", ENVATO_URL, 9999), redditSignal()]);

    const afterProd = (
      await db.select().from(products).where(eq(products.sourceUrl, ENVATO_URL))
    )[0]!;
    const afterSig = (
      await db.select().from(signals).where(eq(signals.sourceId, REDDIT_SOURCE_ID))
    )[0]!;

    // first_seen frozen; last_seen / processed_at move forward.
    expect(afterProd.firstSeenAt.getTime()).toBe(beforeProd.firstSeenAt.getTime());
    expect(afterProd.lastSeenAt.getTime()).toBeGreaterThan(beforeProd.lastSeenAt.getTime());
    expect(afterSig.firstSeenAt.getTime()).toBe(beforeSig.firstSeenAt.getTime());
    expect(afterSig.processedAt.getTime()).toBeGreaterThan(beforeSig.processedAt.getTime());

    // Volatile field refreshed, and still exactly one row (upsert, not insert).
    expect(afterProd.estMonthlyRevenueHigh).toBe(9999);
    const dupes = await db.select().from(products).where(eq(products.sourceUrl, ENVATO_URL));
    expect(dupes).toHaveLength(1);
  });
});