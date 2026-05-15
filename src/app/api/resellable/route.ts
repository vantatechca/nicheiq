import { NextRequest } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { resellableAssets } from "@/lib/db/schema";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { resellableSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");

  const db = getDb();
  const conditions: SQL[] = [];
  if (status)
    conditions.push(
      eq(resellableAssets.status, status as (typeof resellableAssets.status.enumValues)[number]),
    );

  const rows = await db
    .select()
    .from(resellableAssets)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(resellableAssets.createdAt));

  return ok({ assets: rows });
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
  const parsed = resellableSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const [asset] = await db
    .insert(resellableAssets)
    .values({
      id: `asset_user_${Date.now()}`,
      sourcePlatform: parsed.data
        .sourcePlatform as (typeof resellableAssets.sourcePlatform.enumValues)[number],
      sourceUrl: parsed.data.sourceUrl,
      assetType: parsed.data.assetType as (typeof resellableAssets.assetType.enumValues)[number],
      title: parsed.data.title,
      askingPriceUsd: parsed.data.askingPriceUsd,
    })
    .returning();

  return created({ asset });
}
