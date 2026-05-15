import { NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { niches } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const rows = await db.select().from(niches).orderBy(asc(niches.label));
  return ok({ niches: rows });
}
