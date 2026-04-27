import { NextRequest } from "next/server";
import { findOpportunity } from "@/mock/data";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { opportunityUpdateSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound("Opportunity not found");
  return ok({ opportunity: opp });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound("Opportunity not found");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = opportunityUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  const updated = { ...opp, ...parsed.data, updatedAt: new Date().toISOString() };
  return ok({ opportunity: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound("Opportunity not found");
  return ok({ deleted: opp.id });
}
