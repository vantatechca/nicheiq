import { NextRequest } from "next/server";
import {
  findNiche,
  mockOpportunities,
  mockProducts,
  mockCreators,
  mockTrends,
  mockSignals,
} from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const n = findNiche(params.slug);
  if (!n) return notFound();
  return ok({
    niche: n,
    opportunities: mockOpportunities.filter((o) => o.niche === n.slug),
    products: mockProducts.filter((p) => p.niche === n.slug).slice(0, 24),
    creators: mockCreators.filter((c) => c.niches.includes(n.slug)),
    trends: mockTrends.filter((t) => t.niche === n.slug),
    signals: mockSignals.filter((s) => s.niche === n.slug).slice(0, 24),
  });
}
