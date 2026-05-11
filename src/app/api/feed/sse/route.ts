import { NextRequest } from "next/server";
import { desc, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { signals } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE stream of new signals from the DB.
//
// Approach: polling, not pub/sub. Every POLL_INTERVAL_MS we query for any
// signals with processed_at > lastSeen. New rows are pushed; watermark advances.
//
// When real-time pub/sub matters (high signal velocity, many subscribers),
// swap this for an Upstash Redis pub/sub subscriber — the publishing side
// (crawlers in Inngest) would PUBLISH to a channel on insert, and this route
// would SUBSCRIBE. For current scale (low velocity, single user), polling is
// the right tool.
const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_MS = 25_000;

export async function GET(req: NextRequest) {
  // SSE auth via NextAuth cookie. EventSource can't send custom headers,
  // but cookies are forwarded automatically — getServerSession reads them.
  const session = await requireSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();

  // Establish the watermark: the most recent processed_at in the DB. We only
  // push signals processed AFTER this point — never replay history.
  const [latest] = await db
    .select({ processedAt: signals.processedAt })
    .from(signals)
    .orderBy(desc(signals.processedAt))
    .limit(1);

  let watermark: Date = latest?.processedAt ?? new Date(0);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          /* controller closed; ignore */
        }
      };

      const sendData = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* closed */
        }
      };

      send("hello", { ts: Date.now(), kind: "feed", watermark: watermark.toISOString() });

      // Poll loop. Self-rescheduling via setTimeout so we never overlap
      // queries if one is slow.
      let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
      const poll = async () => {
        if (closed) return;
        try {
          const rows = await db
            .select()
            .from(signals)
            .where(gt(signals.processedAt, watermark))
            .orderBy(signals.processedAt)
            .limit(50); // safety cap if a large batch arrives at once

          for (const row of rows) {
            sendData(row);
            // Advance watermark as we go. If the same processed_at appears
            // on multiple rows, the strictly-greater-than filter ensures we
            // don't re-send the row, but it could miss siblings. For low
            // velocity that's fine; for high-velocity ingest, switch to
            // a tie-breaking cursor (processed_at, id).
            if (row.processedAt > watermark) {
              watermark = row.processedAt;
            }
          }
        } catch (err) {
          // Don't tear down the stream on transient errors. Just skip this
          // poll and try again on the next tick.
          console.error("[feed/sse] poll failed:", err);
        }
        if (!closed) {
          pollTimeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      };
      pollTimeoutId = setTimeout(poll, POLL_INTERVAL_MS);

      // Heartbeat to keep proxies (Render, Cloudflare) from closing idle
      // connections. SSE comment lines (": ...") are ignored by clients.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          /* closed */
        }
      }, HEARTBEAT_MS);

      const cleanup = () => {
        closed = true;
        if (pollTimeoutId) clearTimeout(pollTimeoutId);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}