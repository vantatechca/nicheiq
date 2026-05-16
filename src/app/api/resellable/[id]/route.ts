import { NextRequest } from "next/server";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { resellableSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";
import { getResellable, updateResellable } from "@/lib/repos/resellable";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const existing = await getResellable(params.id);
  if (!existing) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = resellableSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const asset = await updateResellable(params.id, parsed.data);
  if (!asset) return notFound();
  return ok({ asset });
}
