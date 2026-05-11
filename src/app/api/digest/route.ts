import { NextRequest } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { digests } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const cadence = req.nextUrl.searchParams.get("cadence");

  const db = getDb();
  const conditions: SQL[] = [];
  if (cadence) {
    conditions.push(eq(digests.cadence, cadence as typeof digests.cadence.enumValues[number]));
  }

  const rows = await db
    .select()
    .from(digests)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(digests.createdAt));

  return ok({ digests: rows });
}