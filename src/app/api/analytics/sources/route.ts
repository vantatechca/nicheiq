import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const rows = await db
    .select({
      id: sources.id,
      label: sources.label,
      sourcePlatform: sources.sourcePlatform,
      itemsTracked: sources.itemsTracked,
    })
    .from(sources)
    .orderBy(desc(sources.itemsTracked));

  return ok({ contribution: rows });
}
