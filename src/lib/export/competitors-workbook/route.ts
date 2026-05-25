import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { competitors, creators } from "@/lib/db/schema";
import { unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { buildCompetitorWorkbook, type CompetitorRow } from "@/lib/export/competitor-workbook";

// exceljs needs the Node runtime (Buffer/streams) — not edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/competitors-workbook
 *
 * The curated deep-dive watchlist as a single styled sheet: one row per tracked
 * competitor (joined to its creator), with the qualitative playbook flattened
 * for the boss. Matches the other workbooks' styling.
 *
 * Note: this table is populated by hand (add a competitor from a creator's
 * playbook page), so the export is empty until you've tracked some.
 */
interface PlaybookShape {
  pricingTiers?: Array<{ label?: string; priceUsd?: number }>;
}

/** Flatten the playbook's pricing tiers into a single readable cell. */
function formatTiers(playbook: unknown): string {
  const tiers = (playbook as PlaybookShape | null)?.pricingTiers;
  if (!Array.isArray(tiers) || tiers.length === 0) return "";
  return tiers
    .map((t) => `${t.label ?? "Tier"} $${Math.round(Number(t.priceUsd ?? 0)).toLocaleString()}`)
    .join(" · ");
}

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const rows = await db
    .select({
      creator: creators.displayName,
      platform: creators.sourcePlatform,
      followers: creators.followerCount,
      revenue: creators.totalEstRevenueUsd,
      depth: competitors.depth,
      playbook: competitors.playbook,
      notes: competitors.notes,
    })
    .from(competitors)
    .innerJoin(creators, eq(competitors.creatorId, creators.id))
    .orderBy(desc(creators.totalEstRevenueUsd));

  const mapped: CompetitorRow[] = rows.map((r) => ({
    creator: r.creator,
    platform: r.platform,
    depth: r.depth,
    followers: r.followers,
    revenue: Math.round(r.revenue),
    pricingTiers: formatTiers(r.playbook),
    notes: r.notes,
  }));

  const buf = await buildCompetitorWorkbook(mapped);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nicheiq-competitors-${stamp}.xlsx"`,
    },
  });
}