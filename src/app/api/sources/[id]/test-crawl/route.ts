import { NextRequest } from "next/server";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { getSource, recordSourceRun } from "@/lib/repos/sources";
import { isMockMode } from "@/lib/repos/mode";
import { inngest } from "@/inngest/client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const source = await getSource(params.id);
  if (!source) return notFound();

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (isMockMode()) {
    // No Inngest worker runs locally, so record a completed run directly. This
    // gives the dashboard visible feedback (Last run / Status) in the demo.
    await recordSourceRun(source.id, { status: "ok" });
  } else {
    // Mark the source running immediately for instant UI feedback, then dispatch.
    // The crawl-source Inngest function runs the per-platform crawler, persists
    // signals, and writes the final ok/error status back to this row.
    // NOTE: send the platform (the crawler key) — a sourceId is not one.
    await recordSourceRun(source.id, { status: "running" });
    await inngest.send({
      name: "crawl/source.requested",
      data: {
        sourceId: source.id,
        platform: source.sourcePlatform,
        config: source.config,
        runId,
      },
    });
  }

  return ok({
    job: {
      id: runId,
      sourceId: source.id,
      status: isMockMode() ? "ok" : "running",
      startedAt: new Date().toISOString(),
      itemsFound: 0,
      itemsNew: 0,
    },
  });
}