import { NextRequest } from "next/server";
import { mockSignals } from "@/mock/data";
import { NICHE_LIST } from "@/lib/utils/constants";
import type { Signal } from "@/lib/types";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function fakeSignal(): Signal {
  const base = pickRandom(mockSignals);
  const id = `sig_live_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  return {
    ...base,
    id,
    score: Math.round(40 + Math.random() * 55),
    snippet: pickRandom([
      "Just hit 100 sales in 6 hours.",
      "Trend volume +180% w/w in US.",
      "Reddit thread crossing 800 upvotes — affiliate energy.",
      "Product Hunt comments turning positive — top 5 of the day.",
      "Kaggle dataset just dropped, 3M rows MIT-licensed.",
      "PLR vendor pushing a 24-piece pack at $39.",
      "Etsy shop expired with healthy review velocity — domain available.",
    ]),
    title: `${pickRandom(["Spike", "New launch", "Milestone", "Drop"])}: ${base.title}`,
    niche: pickRandom(NICHE_LIST).value,
    processedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  // SSE auth via NextAuth cookie. EventSource can't send custom headers,
  // but cookies are forwarded automatically — getServerSession reads them.
  const session = await requireSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

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
          /* controller is closed; ignore */
        }
      };

      const sendData = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* controller is closed; ignore */
        }
      };

      send("hello", { ts: Date.now(), kind: "feed" });

      // Self-rescheduling tick so each interval is genuinely random.
      // setInterval(..., 3000 + Math.random() * 3000) only evaluates the
      // expression once, producing a fixed-cadence stream.
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const tick = () => {
        if (closed) return;
        sendData(fakeSignal());
        timeoutId = setTimeout(tick, 3000 + Math.random() * 3000);
      };
      timeoutId = setTimeout(tick, 3000 + Math.random() * 3000);

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);

      const cleanup = () => {
        closed = true;
        if (timeoutId) clearTimeout(timeoutId);
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