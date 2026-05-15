import { NextRequest } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { trends } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const niche = req.nextUrl.searchParams.get("niche");

  const db = getDb();
  const conditions: SQL[] = [];
  if (niche) conditions.push(eq(trends.niche, niche as (typeof trends.niche.enumValues)[number]));

  const rows = await db
    .select()
    .from(trends)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(trends.momentumScore));

  return ok({ trends: rows });
}
