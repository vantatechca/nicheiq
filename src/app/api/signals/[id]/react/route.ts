import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { signals, activityLog } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized, created } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

/**
 * Log a user reaction on a signal. Backs the ThumbsUp / ThumbsDown /
 * Bookmark buttons on /feed, which were previously firing fake toasts
 * with no persistence.
 *
 * Storage choice: activity_log instead of a new signal_reactions table.
 *   - Schema already exists, no migration needed.
 *   - The data model is "what users did, when" — exactly an audit log row.
 *   - feedback_patterns can later aggregate these into derived patterns
 *     for the scoring engine (the schema reserves derivedFrom: 'votes' |
 *     'saves' | 'builds' | 'abandons', which maps onto these reactions).
 *
 * "save" is idempotent — re-saving an already-saved signal is a no-op
 * and returns alreadySaved: true. "vote_up" / "vote_down" are logged on
 * every click so direction flips create a new row (audit trail of the
 * change); the latest row wins when aggregating.
 */

const reactSchema = z.object({
  kind: z.enum(["vote_up", "vote_down", "save"]),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = reactSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();

  // Verify the signal exists. Cheap query but it gates against junk IDs
  // landing in activity_log.
  const [signal] = await db
    .select({ id: signals.id, title: signals.title })
    .from(signals)
    .where(eq(signals.id, params.id))
    .limit(1);
  if (!signal) return notFound("Signal not found");

  // Save is idempotent — check for an existing save by this user on this
  // signal before inserting. Votes are not idempotent; flipping creates
  // an audit-trail row.
  if (parsed.data.kind === "save") {
    const [existing] = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, userId),
          eq(activityLog.entityType, "signal"),
          eq(activityLog.entityId, params.id),
          eq(activityLog.action, "save"),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(1);
    if (existing) {
      return ok({ alreadySaved: true, kind: parsed.data.kind });
    }
  }

  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(activityLog).values({
    id,
    userId,
    action: parsed.data.kind === "save" ? "save" : "vote",
    entityType: "signal",
    entityId: params.id,
    payload: {
      kind: parsed.data.kind,
      direction:
        parsed.data.kind === "vote_up"
          ? "up"
          : parsed.data.kind === "vote_down"
            ? "down"
            : null,
      signalTitle: signal.title,
    },
  });

  return created({ kind: parsed.data.kind, alreadySaved: false });
}