import { NextRequest } from "next/server";
import { mockCreators } from "@/mock/data";
import { ok, paginate, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const params = req.nextUrl.searchParams;
  const platform = params.get("sourcePlatform");
  const q = params.get("q")?.toLowerCase();
  let rows = [...mockCreators];
  if (platform) rows = rows.filter((c) => c.sourcePlatform === platform);
  if (q) rows = rows.filter((c) => c.displayName.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
  rows.sort((a, b) => b.totalEstRevenueUsd - a.totalEstRevenueUsd);
  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(100, Number(params.get("limit") ?? 25));
  const page = paginate(rows, cursor, limit);
  return ok({ creators: page.items }, { nextCursor: page.nextCursor, total: page.total });
}
