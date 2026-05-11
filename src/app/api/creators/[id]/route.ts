import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, params.id))
    .limit(1);

  if (!creator) return notFound("Creator not found");
  return ok({ creator });
}