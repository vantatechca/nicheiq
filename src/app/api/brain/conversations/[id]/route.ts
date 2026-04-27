import { NextRequest } from "next/server";
import { findConversation, messagesFor } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const c = findConversation(params.id);
  if (!c) return notFound();
  return ok({ conversation: c, messages: messagesFor(c.id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const c = findConversation(params.id);
  if (!c) return notFound();
  return ok({ deleted: c.id });
}
