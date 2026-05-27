import { NextRequest } from "next/server";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { sourceUpdateSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";
import { getSource, updateSource } from "@/lib/repos/sources";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const source = await getSource(params.id);
  if (!source) return notFound("Source not found");
  return ok({ source });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = sourceUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const updated = await updateSource(params.id, parsed.data);
  if (!updated) return notFound("Source not found");
  return ok({ source: updated });
}