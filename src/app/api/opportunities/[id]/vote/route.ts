import { NextRequest } from "next/server";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { voteSchema } from "@/lib/utils/validation";
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
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return ok({ vote: parsed.data.direction, votes: opp.votes });
}
