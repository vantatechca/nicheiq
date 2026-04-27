import { NextRequest } from "next/server";
import { mockActivity } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 25));
  return ok({ activity: mockActivity.slice(0, limit) });
}
