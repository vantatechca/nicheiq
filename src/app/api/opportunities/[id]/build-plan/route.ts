import { NextRequest } from "next/server";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { findOpportunity } from "@/mock/data";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound();
  // Phase G will call Tier-2 (Haiku) here. For now return mock plan unchanged.
  return ok({ plan: opp.aiBuildPlan, refreshedAt: new Date().toISOString() });
}
