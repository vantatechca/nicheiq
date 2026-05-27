import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";
import { mockSources } from "@/mock/data";
import type { Source } from "@/lib/types";
import type { SourcePlatform } from "@/lib/utils/constants";
import { isMockMode } from "./mode";

export interface SourcePatch {
  enabled?: boolean;
  cronSchedule?: string;
  config?: Record<string, unknown>;
}

export interface NewSource {
  sourcePlatform: string;
  label: string;
  config?: Record<string, unknown>;
  cronSchedule?: string;
}

// In mock mode, Next compiles each route handler into its own bundle with its
// own copy of imported module state — so mutating the imported `mockSources`
// array in one route wouldn't be visible to another. Back the mutable mock
// store with globalThis so every bundle in the same process shares ONE array
// (the same trick used for a dev singleton DB client). Seeded with per-row
// clones so we never mutate the original seed objects. Resets on restart.
const globalForMock = globalThis as unknown as { __nicheiqMockSources?: Source[] };
function mockStore(): Source[] {
  if (!globalForMock.__nicheiqMockSources) {
    globalForMock.__nicheiqMockSources = mockSources.map((s) => ({ ...s }));
  }
  return globalForMock.__nicheiqMockSources;
}

/** Fetch a single source by id, or null if not found. */
export async function getSource(id: string) {
  if (isMockMode()) {
    return mockStore().find((s) => s.id === id) ?? null;
  }
  const db = getDb();
  const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return row ?? null;
}

/** List all sources, alphabetically by label. */
export async function listSources() {
  if (isMockMode()) {
    return [...mockStore()].sort((a, b) => a.label.localeCompare(b.label));
  }
  const db = getDb();
  return db.select().from(sources).orderBy(asc(sources.label));
}

/**
 * Apply a partial update to a source and return the updated row (or null if
 * the id doesn't exist). In mock mode the change is applied to the in-memory
 * mock so it survives until reload — matching test-crawl's "behaves real in
 * mock mode" convention.
 */
export async function updateSource(id: string, patch: SourcePatch) {
  if (isMockMode()) {
    const row = mockStore().find((s) => s.id === id);
    if (!row) return null;
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (patch.cronSchedule !== undefined) row.cronSchedule = patch.cronSchedule;
    if (patch.config !== undefined) row.config = patch.config;
    return row;
  }
  const db = getDb();
  const updates: Partial<typeof sources.$inferInsert> = {};
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.cronSchedule !== undefined) updates.cronSchedule = patch.cronSchedule;
  if (patch.config !== undefined) updates.config = patch.config;
  const [updated] = await db.update(sources).set(updates).where(eq(sources.id, id)).returning();
  return updated ?? null;
}

/**
 * Create a source. In mock mode it's appended to the in-memory mock list so it
 * shows up in the dashboard for the rest of the session (matching updateSource).
 */
export async function createSource(input: NewSource) {
  const id = `source_user_${Date.now()}`;
  const cronSchedule = input.cronSchedule ?? "0 */6 * * *";

  if (isMockMode()) {
    const row: Source = {
      id,
      sourcePlatform: input.sourcePlatform as SourcePlatform,
      label: input.label,
      config: input.config ?? {},
      enabled: true,
      cronSchedule,
      lastRunAt: null,
      lastRunStatus: "idle",
      lastError: null,
      itemsTracked: 0,
      requiresHeadless: false,
    };
    mockStore().push(row);
    return row;
  }

  const db = getDb();
  const [row] = await db
    .insert(sources)
    .values({
      id,
      sourcePlatform: input.sourcePlatform as (typeof sources.sourcePlatform.enumValues)[number],
      label: input.label,
      config: input.config ?? {},
      enabled: true,
      cronSchedule,
    })
    .returning();
  return row;
}

/**
 * Record the outcome of a crawl on the source row so the dashboard reflects it.
 * "running" on dispatch, then "ok"/"error" when the crawl finishes. itemsAdded
 * (when > 0) is added to the cumulative itemsTracked count.
 */
export async function recordSourceRun(
  id: string,
  run: { status: Source["lastRunStatus"]; itemsAdded?: number; error?: string | null },
) {
  if (isMockMode()) {
    const row = mockStore().find((s) => s.id === id);
    if (!row) return null;
    row.lastRunStatus = run.status;
    row.lastRunAt = new Date().toISOString();
    row.lastError = run.error ?? null;
    if (typeof run.itemsAdded === "number" && run.itemsAdded > 0) {
      row.itemsTracked += run.itemsAdded;
    }
    return row;
  }
  const db = getDb();
  const [updated] = await db
    .update(sources)
    .set({
      lastRunStatus: run.status,
      lastRunAt: new Date(),
      lastError: run.error ?? null,
      ...(run.itemsAdded && run.itemsAdded > 0
        ? { itemsTracked: sql`${sources.itemsTracked} + ${run.itemsAdded}` }
        : {}),
    })
    .where(eq(sources.id, id))
    .returning();
  return updated ?? null;
}