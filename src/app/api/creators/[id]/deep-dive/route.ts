import { NextRequest } from "next/server";
import { findCreator } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const c = findCreator(params.id);
  if (!c) return notFound();
  return ok({ playbook: c.playbook, deepDiveAt: new Date().toISOString() });
}
