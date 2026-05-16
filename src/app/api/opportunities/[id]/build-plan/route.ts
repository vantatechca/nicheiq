import { NextRequest } from "next/server";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { getOpportunity } from "@/lib/repos/opportunities";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = await getOpportunity(params.id);
  if (!opp) return notFound();
  // Return whatever build plan is currently persisted on the opportunity.
  // A future Inngest "build-plan.refresh.requested" event can synthesize
  // a fresh one with Tier-2 — that's the Phase G follow-up.
  return ok({ plan: opp.aiBuildPlan, refreshedAt: new Date().toISOString() });
}
