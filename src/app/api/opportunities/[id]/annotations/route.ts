import { NextRequest } from "next/server";
import { ok, notFound, badRequest, created, unauthorized } from "@/lib/api/response";
import { annotationSchema } from "@/lib/utils/validation";
import { findOpportunity } from "@/mock/data";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = annotationSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return created({
    annotation: {
      id: `ann_${Date.now()}`,
      opportunityId: opp.id,
      userId: session.user.id,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound();
  return ok({ annotations: [] });
}
