import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feedbackPatterns } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const rows = await db
    .select()
    .from(feedbackPatterns)
    .orderBy(desc(feedbackPatterns.confidence));

  return ok({ patterns: rows });
}