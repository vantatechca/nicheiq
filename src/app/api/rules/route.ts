import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { goldenRules } from "@/lib/db/schema";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { ruleSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const rows = await db.select().from(goldenRules).orderBy(desc(goldenRules.createdAt));
  return ok({ rules: rows });
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
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();
  const [rule] = await db
    .insert(goldenRules)
    .values({
      id: `rule_user_${Date.now()}`,
      label: parsed.data.label,
      description: parsed.data.description ?? "",
      ruleType: parsed.data.ruleType,
      niche: parsed.data.niche
        ? (parsed.data.niche as (typeof goldenRules.niche.enumValues)[number])
        : null,
      keywords: parsed.data.keywords,
      weight: parsed.data.weight,
      active: parsed.data.active,
      createdBy: userId,
    })
    .returning();

  return created({ rule });
}
