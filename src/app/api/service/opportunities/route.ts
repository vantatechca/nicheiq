import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { eq, gte, and, desc, SQL } from "drizzle-orm";

export const runtime = "nodejs";

// Bounds for numeric query params. limit is capped because this is a service
// endpoint hit by integrations — no UI pagination — so a malformed call
// asking for limit=10_000_000 should fail closed instead of crushing the DB.
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
const DEFAULT_MIN_SCORE = 65;

type NicheEnum = (typeof opportunities.niche.enumValues)[number];
const VALID_NICHES = new Set<string>(opportunities.niche.enumValues);

/** Parse a query-param number with finite/positive checks. */
function parsePositiveInt(raw: string | null, fallback: number, max: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function parseScore(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  // Score is 0-100 in the DB; clamp.
  return Math.min(100, Math.max(0, n));
}

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

  // Validate niche against the actual pg enum. The previous build did
  // `eq(opportunities.niche, niche as any)`, so a garbage value like
  // ?niche=foo would reach Postgres as a parameter and surface as a
  // confusing PG `invalid input value for enum` 500. Better to reject it
  // here with a 400 listing what the caller actually got wrong.
  const nicheRaw = searchParams.get("niche");
  let niche: NicheEnum | null = null;
  if (nicheRaw) {
    if (!VALID_NICHES.has(nicheRaw)) {
      return NextResponse.json(
        {
          error: "invalid niche",
          value: nicheRaw,
          message:
            "Niche must be one of the pg enum values. See opportunities.niche.enumValues for the full list.",
        },
        { status: 400 },
      );
    }
    niche = nicheRaw as NicheEnum;
  }

  const minScore = parseScore(searchParams.get("minScore"), DEFAULT_MIN_SCORE);
  const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const excludeRaw = searchParams.get("exclude") ?? "";
  const exclude = excludeRaw
    ? excludeRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const conditions: SQL[] = [gte(opportunities.score, minScore)];
  if (niche) conditions.push(eq(opportunities.niche, niche));

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