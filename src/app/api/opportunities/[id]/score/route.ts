import { NextRequest } from "next/server";
import { findOpportunity } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound();
  // Recompute is wired in Phase F. For now return the existing breakdown.
  return ok({ score: opp.score, breakdown: opp.scoreBreakdown });
}
