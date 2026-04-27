import { NextRequest } from "next/server";
import { mockCompetitors } from "@/mock/data";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { z } from "zod";

const competitorSchema = z.object({
  creatorId: z.string(),
  depth: z.enum(["light", "deep"]).default("light"),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  return ok({ competitors: mockCompetitors });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = competitorSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return created({
    competitor: {
      id: `comp_${Date.now()}`,
      ...parsed.data,
      notes: parsed.data.notes ?? "",
      playbook: { pricingTiers: [], postingCadence: "", topTags: [], funnels: [], signatureStyle: "" },
      lastReviewedAt: new Date().toISOString(),
    },
  });
}
