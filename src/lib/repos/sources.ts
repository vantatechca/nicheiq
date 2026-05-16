import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";
import { mockSources } from "@/mock/data";
import { isMockMode } from "./mode";

/** Fetch a single source by id, or null if not found. */
export async function getSource(id: string) {
  if (isMockMode()) {
    return mockSources.find((s) => s.id === id) ?? null;
  }
  const db = getDb();
  const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return row ?? null;
}
