import { NextRequest } from "next/server";
import { and, desc, eq, gte, lte, lt, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { ok, created, badRequest, unauthorized } from "@/lib/api/response";
import { opportunityCreateSchema, searchQuerySchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = searchQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten());
  const q = parsed.data;

  const db = getDb();

  // Build WHERE conditions from validated query params. Each is type-safe
  // because Drizzle's column refs carry their pg types.
  const conditions: SQL[] = [];
  if (q.niche)
    conditions.push(
      eq(opportunities.niche, q.niche as (typeof opportunities.niche.enumValues)[number]),
    );
  if (q.status)
    conditions.push(
      eq(opportunities.status, q.status as (typeof opportunities.status.enumValues)[number]),
    );
  if (q.type)
    conditions.push(
      eq(
        opportunities.opportunityType,
        q.type as (typeof opportunities.opportunityType.enumValues)[number],
      ),
    );
  if (q.buildEffort)
    conditions.push(
      eq(
        opportunities.buildEffort,
        q.buildEffort as (typeof opportunities.buildEffort.enumValues)[number],
      ),
    );
  if (q.minScore != null) conditions.push(gte(opportunities.score, q.minScore));
  if (q.maxScore != null) conditions.push(lte(opportunities.score, q.maxScore));
  if (q.q) {
    const needle = `%${q.q}%`;
    const textMatch = or(ilike(opportunities.title, needle), ilike(opportunities.summary, needle));
    if (textMatch) conditions.push(textMatch);
  }

  // Keyset cursor pagination. Cursor encodes the last seen sort-key value.
  // This works with real DB pagination (unlike offset, which doesn't scale).
  // Format: "<sortValue>:<id>" — id is the tie-breaker for stable ordering.
  if (q.cursor) {
    const [cursorValue, cursorId] = q.cursor.split(":");
    if (cursorValue && cursorId) {
      if (q.sort === "newest") {
        // Sorting DESC by createdAt: cursor row is (createdAt, id);
        // next page is rows with createdAt < cursor.createdAt
        conditions.push(lt(opportunities.createdAt, new Date(cursorValue)));
      } else if (q.sort === "revenue") {
        conditions.push(lt(opportunities.projectedRevenueUsd, Number(cursorValue)));
      } else {
        // default: score desc
        conditions.push(lt(opportunities.score, Number(cursorValue)));
      }
    }
  }

  // Sort. Default is score desc (highest opportunities first).
  const orderBy = (() => {
    if (q.sort === "newest") return [desc(opportunities.createdAt), desc(opportunities.id)];
    if (q.sort === "revenue")
      return [desc(opportunities.projectedRevenueUsd), desc(opportunities.id)];
    return [desc(opportunities.score), desc(opportunities.id)];
  })();

  // Fetch limit + 1 so we know whether there's a next page without a separate count.
  const limit = q.limit;
  const rows = await db
    .select()
    .from(opportunities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    if (q.sort === "newest") nextCursor = `${last.createdAt.toISOString()}:${last.id}`;
    else if (q.sort === "revenue") nextCursor = `${last.projectedRevenueUsd}:${last.id}`;
    else nextCursor = `${last.score}:${last.id}`;
  }

  return ok({ opportunities: items }, { nextCursor, total: null });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = opportunityCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  // Manual creation — score starts at 50, AI pieces left as defaults until
  // a downstream Inngest job (score-opportunity, enrich-product) refines them.
  const [newOpp] = await db
    .insert(opportunities)
    .values({
      id: `opportunity_user_${Date.now()}`,
      title: parsed.data.title,
      summary: parsed.data.summary,
      niche: parsed.data.niche as (typeof opportunities.niche.enumValues)[number],
      opportunityType: parsed.data
        .opportunityType as (typeof opportunities.opportunityType.enumValues)[number],
      buildEffort: parsed.data.buildEffort as (typeof opportunities.buildEffort.enumValues)[number],
      projectedRevenueUsd: parsed.data.projectedRevenueUsd ?? 1000,
      status: "tracking",
      sourceProductIds: [],
      sourceSignalIds: [],
      aiRationale: "Manually created — pending AI synthesis.",
      aiBuildPlan: { weeks: [], stack: [], risks: [], monetization: [], successMetrics: [] },
      score: 50,
      scoreBreakdown: {
        dimensions: {
          demand: { value: 50, weight: 0.25 },
          competition: { value: 50, weight: 0.2 },
          revenue: { value: 50, weight: 0.25 },
          buildEffort: { value: 50, weight: 0.15 },
          trend: { value: 50, weight: 0.15 },
        },
        ruleModifiers: [],
        patternModifiers: [],
        finalScore: 50,
        computedAt: new Date().toISOString(),
      },
      createdBy: userId,
    })
    .returning();

  return created({ opportunity: newOpp });
}
