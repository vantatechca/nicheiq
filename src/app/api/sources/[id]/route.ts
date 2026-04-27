import { NextRequest } from "next/server";
import { mockSources } from "@/mock/data";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { sourceUpdateSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const s = mockSources.find((x) => x.id === params.id);
  if (!s) return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = sourceUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return ok({ source: { ...s, ...parsed.data } });
}
