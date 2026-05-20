import { NextRequest } from "next/server";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { isMockMode } from "@/lib/repos/mode";
import { inngest } from "@/inngest/client";

/**
 * POST /api/opportunities/synthesize
 *
 * Triggers the synthesize-opportunities Inngest job on demand, instead of
 * waiting for its scheduled cron. The job groups recent unprocessed signals by
 * niche, asks the model for opportunity proposals, dedupes, persists, and
 * routes each new opportunity through the scoring engine.
 *
 * Fire-and-forget: returns immediately with a queued status. New opportunities
 * appear in the list once the job finishes (a few seconds to a minute).
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  // Optional niche scope from the request body. When present, synthesis runs
  // for just that niche (manual run while the list is filtered to one niche).
  let niche: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.niche === "string" && body.niche.length > 0) niche = body.niche;
  } catch {
    // No body / invalid JSON → unscoped batch. Fine.
  }

  const runId = `synth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (!isMockMode()) {
    await inngest.send({
      name: "opportunity/synthesize.batch",
      data: niche ? { niche } : {},
    });
  }

  return ok({
    job: {
      id: runId,
      status: isMockMode() ? "skipped_mock" : "queued",
      niche: niche ?? null,
      startedAt: new Date().toISOString(),
    },
  });
}
