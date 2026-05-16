import { NextRequest } from "next/server";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { getSource } from "@/lib/repos/sources";
import { isMockMode } from "@/lib/repos/mode";
import { inngest } from "@/inngest/client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const source = await getSource(params.id);
  if (!source) return notFound();

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (!isMockMode()) {
    // Real dispatch — the crawl-source Inngest function picks this up,
    // runs the appropriate per-platform crawler, and persists signals.
    await inngest.send({
      name: "crawl/source.requested",
      data: { sourceId: source.id, runId },
    });
  }

  return ok({
    job: {
      id: runId,
      sourceId: source.id,
      status: "queued",
      startedAt: new Date().toISOString(),
      itemsFound: 0,
      itemsNew: 0,
    },
  });
}
