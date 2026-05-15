import { NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

const newSourceSchema = z.object({
  sourcePlatform: z.string().min(1),
  label: z.string().min(2),
  config: z.record(z.unknown()).optional(),
  cronSchedule: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const rows = await db.select().from(sources).orderBy(asc(sources.label));
  return ok({ sources: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = newSourceSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const [source] = await db
    .insert(sources)
    .values({
      id: `source_user_${Date.now()}`,
      sourcePlatform: parsed.data
        .sourcePlatform as (typeof sources.sourcePlatform.enumValues)[number],
      label: parsed.data.label,
      config: parsed.data.config ?? {},
      enabled: true,
      cronSchedule: parsed.data.cronSchedule ?? "0 */6 * * *",
    })
    .returning();

  return created({ source });
}
