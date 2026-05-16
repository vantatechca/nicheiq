import { NextRequest } from "next/server";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { listSignals } from "@/lib/repos/signals";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const params = req.nextUrl.searchParams;
  const niche = params.get("niche") ?? undefined;
  const type = params.get("type") ?? undefined;
  const minScoreRaw = params.get("minScore");
  const minScore = minScoreRaw ? Number(minScoreRaw) : undefined;
  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));

  const page = await listSignals({ niche, type, minScore, cursor, limit });
  return ok({ signals: page.items }, { nextCursor: page.nextCursor, total: page.total });
}
