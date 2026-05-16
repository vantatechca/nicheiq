import { NextRequest } from "next/server";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { searchOpportunities } from "@/lib/repos/opportunities";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const matches = await searchOpportunities(q, 25);
  return ok({ opportunities: matches }, { matched: matches.length });
}
