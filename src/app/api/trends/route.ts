import { NextRequest } from "next/server";
import { mockTrends } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const niche = req.nextUrl.searchParams.get("niche");
  const rows = niche ? mockTrends.filter((t) => t.niche === niche) : mockTrends;
  return ok({ trends: rows });
}
