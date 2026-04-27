import { NextRequest } from "next/server";
import { ok, unauthorized } from "@/lib/api/response";
import { mockOpportunities } from "@/mock/data";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) return ok({ opportunities: mockOpportunities.slice(0, 10) });
  const matches = mockOpportunities.filter(
    (o) =>
      o.title.toLowerCase().includes(q) ||
      o.summary.toLowerCase().includes(q) ||
      o.niche.toLowerCase().includes(q),
  );
  return ok({ opportunities: matches.slice(0, 25) }, { matched: matches.length });
}
