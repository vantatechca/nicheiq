import { NextRequest } from "next/server";
import { mockGoldenRules } from "@/mock/data";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";
import { ruleSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const r = mockGoldenRules.find((x) => x.id === params.id);
  if (!r) return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = ruleSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return ok({ rule: { ...r, ...parsed.data } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const r = mockGoldenRules.find((x) => x.id === params.id);
  if (!r) return notFound();
  return ok({ deleted: r.id });
}
