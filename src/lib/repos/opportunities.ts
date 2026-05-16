import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { mockOpportunities, findOpportunity } from "@/mock/data";
import { isMockMode } from "./mode";

/**
 * Full-text-ish search across opportunities. Used by the search bar.
 * In mock mode we filter the in-memory array by substring match.
 * In live mode we use ILIKE on title, summary, and niche.
 */
export async function searchOpportunities(query: string, limit = 25) {
  const q = query.trim();

  if (isMockMode()) {
    if (!q) return mockOpportunities.slice(0, 10);
    const needle = q.toLowerCase();
    return mockOpportunities
      .filter(
        (o) =>
          o.title.toLowerCase().includes(needle) ||
          o.summary.toLowerCase().includes(needle) ||
          o.niche.toLowerCase().includes(needle),
      )
      .slice(0, limit);
  }

  const db = getDb();
  if (!q) {
    return db
      .select()
      .from(opportunities)
      .orderBy(desc(opportunities.score))
      .limit(10);
  }
  const needle = `%${q}%`;
  const textMatch = or(
    ilike(opportunities.title, needle),
    ilike(opportunities.summary, needle),
  );
  return db
    .select()
    .from(opportunities)
    .where(textMatch)
    .orderBy(desc(opportunities.score))
    .limit(limit);
}

/** Fetch a single opportunity by id, or null if not found. */
export async function getOpportunity(id: string) {
  if (isMockMode()) {
    return findOpportunity(id) ?? null;
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);
  return row ?? null;
}

/** Top opportunities by score, newest first. Used by the digest generator. */
export async function getTopOpportunities(limit = 5) {
  if (isMockMode()) {
    return mockOpportunities.slice(0, limit);
  }
  const db = getDb();
  return db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.score), desc(opportunities.createdAt))
    .limit(limit);
}