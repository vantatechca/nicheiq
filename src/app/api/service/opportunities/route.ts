import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { eq, gte, and, desc, SQL } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Reject if the server key is unconfigured — otherwise the expected header
  // becomes the literal string "Bearer undefined" and anyone sending exactly
  // that walks in. Fail closed when the env is missing.
  const expectedKey = process.env.SERVICE_API_KEY;
  if (!expectedKey) {
    return NextResponse.json({ error: "service auth not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche");
  const minScore = Number(searchParams.get("minScore") ?? 65);
  const limit = Number(searchParams.get("limit") ?? 100);
  const excludeRaw = searchParams.get("exclude") ?? "";
  const exclude = excludeRaw ? excludeRaw.split(",") : [];

  const conditions: SQL[] = [gte(opportunities.score, minScore)];
  if (niche) conditions.push(eq(opportunities.niche, niche as any));

  const db = getDb();

  let rows = await db
    .select()
    .from(opportunities)
    .where(and(...conditions))
    .orderBy(desc(opportunities.createdAt))
    .limit(limit + exclude.length);

  rows = rows.filter((r) => !exclude.includes(r.id)).slice(0, limit);

  return NextResponse.json({ opportunities: rows });
}
