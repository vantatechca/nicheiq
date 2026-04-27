import { NextRequest } from "next/server";
import { mockNiches } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  return ok({ niches: mockNiches });
}
