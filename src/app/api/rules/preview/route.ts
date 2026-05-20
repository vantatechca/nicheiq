import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { ruleSchema } from "@/lib/utils/validation";
import { applyGoldenRules } from "@/lib/scoring/golden-rules";
import type { GoldenRule } from "@/lib/types";

/**
 * POST /api/rules/preview
 *
 * Simulates a DRAFT rule against the current opportunity set without saving it.
 * Returns how many opportunities the rule would match, the net score impact,
 * and how many would be blocked — so you can see a rule's effect before
 * committing it. Read-only: nothing is persisted.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Reuse the same rule shape as create, so the preview matches what you'd save.
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid rule", parsed.error.flatten());

  const draft: GoldenRule = {
    id: "__preview__",
    label: parsed.data.label,
    description: parsed.data.description ?? "",
    ruleType: parsed.data.ruleType,
    niche: parsed.data.niche ?? null,
    keywords: parsed.data.keywords,
    weight: parsed.data.weight,
    active: true,
  } as GoldenRule;

  const db = getDb();
  const opps = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      summary: opportunities.summary,
      niche: opportunities.niche,
      opportunityType: opportunities.opportunityType,
      aiRationale: opportunities.aiRationale,
      score: opportunities.score,
    })
    .from(opportunities);

  let matched = 0;
  let blocked = 0;
  let totalDelta = 0;
  const examples: { id: string; title: string; delta: number }[] = [];

  for (const o of opps) {
    const result = applyGoldenRules(o as never, [draft]);
    if (result.modifiers.length === 0) continue;
    matched += 1;
    if (result.blocked) blocked += 1;
    totalDelta += result.delta;
    if (examples.length < 5) {
      examples.push({ id: o.id, title: o.title, delta: result.delta });
    }
  }

  return ok({
    preview: {
      total: opps.length,
      matched,
      blocked,
      unaffected: opps.length - matched,
      avgDelta: matched > 0 ? Math.round((totalDelta / matched) * 10) / 10 : 0,
      examples,
    },
  });
}