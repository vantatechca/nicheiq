import { NextRequest } from "next/server";
import { mockOpportunities, mockKpis } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { SCORE_BUCKETS } from "@/lib/utils/constants";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const buckets = SCORE_BUCKETS.map((b) => ({
    ...b,
    count: mockOpportunities.filter((o) => o.score >= b.min && o.score <= b.max).length,
  }));
  return ok({ buckets, sparkline: mockKpis.scoreSparkline, avg: mockKpis.avgScore });
}
