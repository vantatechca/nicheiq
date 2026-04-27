import { NextRequest } from "next/server";
import { mockNiches, mockOpportunities } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const rows = mockNiches.map((n) => ({
    ...n,
    projectedRevenueUsd: mockOpportunities
      .filter((o) => o.niche === n.slug)
      .reduce((s, o) => s + o.projectedRevenueUsd, 0),
  }));
  return ok({ niches: rows });
}
