import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { trends } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { keyword: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const decoded = decodeURIComponent(params.keyword);

  const db = getDb();
  // Multiple trends can share a keyword (different geos / dates) — return the
  // freshest snapshot by snapshot_date desc, with a fallback to the first match.
  const [trend] = await db
    .select()
    .from(trends)
    .where(eq(trends.keyword, decoded))
    .orderBy(trends.snapshotDate)
    .limit(1);

  if (!trend) return notFound("Trend not found");
  return ok({ trend });
}
