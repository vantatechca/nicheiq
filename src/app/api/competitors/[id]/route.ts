import { NextRequest } from "next/server";
import { mockCompetitors } from "@/mock/data";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { z } from "zod";

const updateSchema = z.object({
  depth: z.enum(["light", "deep"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const c = mockCompetitors.find((x) => x.id === params.id);
  if (!c) return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return ok({ competitor: { ...c, ...parsed.data, lastReviewedAt: new Date().toISOString() } });
}
