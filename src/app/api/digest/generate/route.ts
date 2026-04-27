import { NextRequest } from "next/server";
import { mockDigests, mockOpportunities, mockProducts } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  // Phase G/H will use Tier-3 (Sonnet). For now synthesize from latest mock data.
  const top = mockOpportunities.slice(0, 5);
  const digest = {
    id: `digest_${Date.now()}`,
    cadence: "on_demand" as const,
    periodStart: new Date(Date.now() - 86_400_000).toISOString(),
    periodEnd: new Date().toISOString(),
    topOpportunityIds: top.map((o) => o.id),
    risingNiches: [...new Set(top.map((o) => o.niche))],
    topProducts: mockProducts.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      revenue: p.estMonthlyRevenueHigh ?? 0,
    })),
    aiSummary: `On-demand digest: ${top[0]?.title} leads. ${top.length} opportunities scored above 75 in the last day.`,
    sentTo: [],
    createdAt: new Date().toISOString(),
  };
  return ok({ digest, history: mockDigests.length });
}
