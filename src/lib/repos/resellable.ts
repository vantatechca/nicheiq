import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { resellableAssets } from "@/lib/db/schema";
import { findResellable } from "@/mock/data";
import { isMockMode } from "./mode";

/** Fetch a single resellable asset by id, or null if not found. */
export async function getResellable(id: string) {
  if (isMockMode()) {
    return findResellable(id) ?? null;
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(resellableAssets)
    .where(eq(resellableAssets.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Apply a partial update. In mock mode this is non-persistent — we just
 * merge the patch onto the in-memory copy and return it. In live mode it
 * UPDATEs the row and returns the new value.
 *
 * The patch shape is whatever `resellableSchema.partial()` accepts — the
 * Zod schema validates fields as plain strings while the Drizzle schema
 * uses pgEnums, so we cast at the .set() boundary. Postgres rejects
 * out-of-enum values at insert time, which is acceptable here.
 */
export async function updateResellable(id: string, patch: Record<string, unknown>) {
  if (isMockMode()) {
    const existing = findResellable(id);
    if (!existing) return null;
    return { ...existing, ...patch };
  }
  const db = getDb();
  // Strip undefined values so Drizzle doesn't try to set them to NULL.
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return getResellable(id);
  }
  const [row] = await db
    .update(resellableAssets)
    .set(update as Partial<typeof resellableAssets.$inferInsert>)
    .where(eq(resellableAssets.id, id))
    .returning();
  return row ?? null;
}
