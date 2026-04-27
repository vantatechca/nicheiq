import { NextRequest } from "next/server";
import { findProduct } from "@/mock/data";
import { notFound, unauthorized, created } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const p = findProduct(params.id);
  if (!p) return notFound();
  return created({
    opportunity: {
      id: `opp_from_${p.id}`,
      title: `Replicate: ${p.title}`,
      summary: `Replication candidate sourced from ${p.creator ?? "unknown"} on ${p.sourcePlatform}.`,
      niche: p.niche,
      opportunityType: "replication",
      buildEffort: "weekend",
      score: 60,
      status: "tracking",
      sourceProductIds: [p.id],
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    },
  });
}
