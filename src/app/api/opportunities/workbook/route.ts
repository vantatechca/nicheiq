/**
 * src/app/api/opportunities/workbook/route.ts
 *
 * GET /api/opportunities/workbook
 *
 * Accepts the same filter params as the opportunities page, fetches rows,
 * maps them to OppRow, and delegates all workbook building to the existing
 * buildOpportunityWorkbook() in src/lib/export/opportunity-workbook.ts.
 *
 * The workbook has 3 sheets:
 *   - Top Candidates  (score >= 78, capped at 15, with totals row)
 *   - All Opportunities (every filtered row, sorted by score)
 *   - By Niche        (count / avg score / total revenue per niche)
 */

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { buildOpportunityWorkbook, type OppRow } from "@/lib/export/opportunity-workbook";
import type { SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams;
  const niche    = sp.get("niche");
  const type     = sp.get("type");
  const effort   = sp.get("buildEffort") ?? sp.get("effort");
  const status   = sp.get("status");
  const minScore = Number(sp.get("minScore") ?? 0);
  const search   = sp.get("q") ?? "";

  const db = getDb();
  const conditions: SQL[] = [];

  if (niche)        conditions.push(eq(opportunities.niche,           niche   as never));
  if (type)         conditions.push(eq(opportunities.opportunityType, type    as never));
  if (effort)       conditions.push(eq(opportunities.buildEffort,     effort  as never));
  if (status)       conditions.push(eq(opportunities.status,          status  as never));
  if (minScore > 0) conditions.push(gte(opportunities.score, minScore));
  if (search.trim()) {
    const needle = `%${search.trim()}%`;
    const match  = or(ilike(opportunities.title, needle), ilike(opportunities.summary, needle));
    if (match) conditions.push(match);
  }

  const rows = await db
    .select({
      title:               opportunities.title,
      niche:               opportunities.niche,
      opportunityType:     opportunities.opportunityType,
      buildEffort:         opportunities.buildEffort,
      status:              opportunities.status,
      score:               opportunities.score,
      projectedRevenueUsd: opportunities.projectedRevenueUsd,
      createdAt:           opportunities.createdAt,
    })
    .from(opportunities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(opportunities.score))
    .limit(5000);

  // Map to the OppRow shape expected by buildOpportunityWorkbook
  const oppRows: OppRow[] = rows.map((r) => ({
    title:     r.title,
    niche:     r.niche,
    type:      r.opportunityType,
    effort:    r.buildEffort,
    status:    r.status,
    score:     r.score,
    revenue:   r.projectedRevenueUsd,
    createdAt: r.createdAt,
  }));

  const buffer = await buildOpportunityWorkbook(oppRows);

  const today    = new Date().toISOString().slice(0, 10);
  const filename = `nicheiq-opportunities-${today}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}