import { and, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators, products } from "@/lib/db/schema";
import { excludeSeedsClause } from "@/lib/db/seed-filter";

type PlatformValue = (typeof creators.sourcePlatform.enumValues)[number];

/** Best-effort public profile URL for a creator handle on a given platform. */
function profileUrl(platform: string, handle: string): string {
  switch (platform) {
    case "envato":
      return `https://themeforest.net/user/${handle}`;
    case "gumroad":
      return `https://${handle}.gumroad.com`;
    case "etsy":
      return `https://www.etsy.com/shop/${handle}`;
    case "creative_market":
      return `https://creativemarket.com/${handle}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(handle)}`;
  }
}

/** Midpoint of a low/high estimate range; missing values fall back gracefully. */
function midpoint(low: number | null, high: number | null): number {
  if (low != null && high != null) return (low + high) / 2;
  if (high != null) return high;
  if (low != null) return low;
  return 0;
}

/**
 * Rolls crawled market products up into the `creators` table: one row per
 * (platform, handle), with product count, summed est. monthly revenue, and the
 * distinct niches the creator sells in. Idempotent — re-running refreshes the
 * figures in place via the unique (source_platform, handle) index, and never
 * touches enrichment fields (playbook, notes, avatar, follower_count) that the
 * deep-dive function owns.
 *
 * Only real market products feed this (opportunity_id NULL, seeds excluded).
 */
export async function rollupCreators(): Promise<{ creators: number; fromProducts: number }> {
  const db = getDb();

  const rows = await db
    .select({
      platform: products.sourcePlatform,
      handle: products.creatorId,
      name: products.creator,
      niche: products.niche,
      revLow: products.estMonthlyRevenueLow,
      revHigh: products.estMonthlyRevenueHigh,
    })
    .from(products)
    .where(
      and(
        isNull(products.opportunityId),
        isNotNull(products.creatorId),
        ...excludeSeedsClause(products.id, false),
      ),
    );

  // Aggregate by platform+handle in memory — product volume is small.
  const map = new Map<
    string,
    {
      platform: PlatformValue;
      handle: string;
      name: string;
      revenue: number;
      count: number;
      niches: Set<string>;
    }
  >();

  for (const r of rows) {
    if (!r.handle) continue;
    const key = `${r.platform}:${r.handle}`;
    const m = map.get(key) ?? {
      platform: r.platform,
      handle: r.handle,
      name: r.name ?? r.handle,
      revenue: 0,
      count: 0,
      niches: new Set<string>(),
    };
    m.revenue += midpoint(r.revLow, r.revHigh);
    m.count += 1;
    m.niches.add(r.niche);
    map.set(key, m);
  }

  const values = [...map.values()].map((m) => ({
    id: `creator_from_product_${m.platform}_${m.handle}`,
    sourcePlatform: m.platform,
    handle: m.handle,
    displayName: m.name || m.handle,
    profileUrl: profileUrl(m.platform, m.handle),
    productCount: m.count,
    totalEstRevenueUsd: Math.round(m.revenue),
    niches: [...m.niches],
  }));

  if (!values.length) return { creators: 0, fromProducts: rows.length };

  // Only the roll-up-owned metrics update on conflict; enrichment-owned fields
  // (display_name from a deep dive, avatar, playbook, notes) are left intact.
  await db
    .insert(creators)
    .values(values)
    .onConflictDoUpdate({
      target: [creators.sourcePlatform, creators.handle],
      set: {
        productCount: sql`excluded.product_count`,
        totalEstRevenueUsd: sql`excluded.total_est_revenue_usd`,
        niches: sql`excluded.niches`,
      },
    });

  return { creators: values.length, fromProducts: rows.length };
}