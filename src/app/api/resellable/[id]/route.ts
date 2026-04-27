import { NextRequest } from "next/server";
import { findResellable } from "@/mock/data";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { resellableSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const a = findResellable(params.id);
  if (!a) return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = resellableSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return ok({ asset: { ...a, ...parsed.data } });
}
