import { NextRequest } from "next/server";
import { mockTrends } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { keyword: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const decoded = decodeURIComponent(params.keyword);
  const trend = mockTrends.find((t) => t.keyword === decoded);
  if (!trend) return notFound();
  return ok({ trend });
}
