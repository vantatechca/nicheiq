import { NextRequest } from "next/server";
import { mockProducts } from "@/mock/data";
import { ok, paginate, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const params = req.nextUrl.searchParams;
  const niche = params.get("niche");
  const platform = params.get("sourcePlatform");
  const q = params.get("q")?.toLowerCase();
  let rows = [...mockProducts];
  if (niche) rows = rows.filter((p) => p.niche === niche);
  if (platform) rows = rows.filter((p) => p.sourcePlatform === platform);
  if (q) rows = rows.filter((p) => p.title.toLowerCase().includes(q));
  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(100, Number(params.get("limit") ?? 25));
  const page = paginate(rows, cursor, limit);
  return ok({ products: page.items }, { nextCursor: page.nextCursor, total: page.total });
}
