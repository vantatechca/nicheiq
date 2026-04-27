import { NextRequest } from "next/server";
import { mockSignals } from "@/mock/data";
import { ok, paginate, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const params = req.nextUrl.searchParams;
  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(100, Number(params.get("limit") ?? 50));
  const page = paginate(mockSignals, cursor, limit);
  return ok({ signals: page.items }, { nextCursor: page.nextCursor, total: page.total });
}
