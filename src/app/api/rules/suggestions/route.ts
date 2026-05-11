import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feedbackPatterns } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  // Phase F will derive these dynamically from vote/save/build patterns.
  // For now: surface feedback_patterns ordered by AI-confidence desc.
  const db = getDb();
  const rows = await db
    .select()
    .from(feedbackPatterns)
    .orderBy(desc(feedbackPatterns.confidence));

  return ok({ suggestions: rows });
}