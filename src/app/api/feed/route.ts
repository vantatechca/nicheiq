import { NextRequest } from "next/server";
import { mockSignals } from "@/mock/data";
import { ok, paginate, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const params = req.nextUrl.searchParams;
  const niche = params.get("niche");
  const type = params.get("type");
  const minScore = Number(params.get("minScore") ?? 0);
  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));

  let rows = [...mockSignals].sort(
    (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
  );
  if (niche) rows = rows.filter((s) => s.niche === niche);
  if (type) rows = rows.filter((s) => s.signalType === type);
  if (minScore) rows = rows.filter((s) => s.score >= minScore);

  const page = paginate(rows, cursor, limit);
  return ok({ signals: page.items }, { nextCursor: page.nextCursor, total: page.total });
}
