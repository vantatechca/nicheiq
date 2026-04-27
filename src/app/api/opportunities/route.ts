import { NextRequest } from "next/server";
import { mockOpportunities } from "@/mock/data";
import { ok, created, badRequest, paginate, unauthorized } from "@/lib/api/response";
import { opportunityCreateSchema, searchQuerySchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten());
  const q = parsed.data;
  let rows = [...mockOpportunities];
  if (q.niche) rows = rows.filter((o) => o.niche === q.niche);
  if (q.status) rows = rows.filter((o) => o.status === q.status);
  if (q.type) rows = rows.filter((o) => o.opportunityType === q.type);
  if (q.buildEffort) rows = rows.filter((o) => o.buildEffort === q.buildEffort);
  if (q.minScore != null) rows = rows.filter((o) => o.score >= q.minScore!);
  if (q.maxScore != null) rows = rows.filter((o) => o.score <= q.maxScore!);
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter(
      (o) => o.title.toLowerCase().includes(needle) || o.summary.toLowerCase().includes(needle),
    );
  }
  if (q.sort === "newest") rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  else if (q.sort === "revenue") rows.sort((a, b) => b.projectedRevenueUsd - a.projectedRevenueUsd);
  else rows.sort((a, b) => b.score - a.score);

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 25));
  const page = paginate(rows, cursor, limit);
  return ok({ opportunities: page.items }, { nextCursor: page.nextCursor, total: page.total });
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
  // Mock create — return synthetic record
  const newOpp = {
    id: `opportunity_user_${Date.now()}`,
    ...parsed.data,
    score: 50,
    status: "tracking",
    sourceProductIds: [],
    sourceSignalIds: [],
    projectedRevenueUsd: parsed.data.projectedRevenueUsd ?? 1000,
    aiRationale: "Manually created — pending AI synthesis.",
    aiBuildPlan: { weeks: [], stack: [], risks: [], monetization: [], successMetrics: [] },
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
    createdBy: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    votes: { up: 0, down: 0 },
    saved: false,
  };
  return created({ opportunity: newOpp });
}
