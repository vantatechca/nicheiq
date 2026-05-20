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

  // Source platform tolerance: the form accepts free text, but the DB column is
  // an enum. Normalize the typed value (lowercase, spaces/hyphens → underscore)
  // and match against the enum. If it's a known platform, use it. If not, fall
  // back to a generic platform and preserve the original typed name in notes so
  // nothing is lost — Postgres would otherwise reject an out-of-enum value.
  const enumValues = resellableAssets.sourcePlatform.enumValues as readonly string[];
  const FALLBACK_PLATFORM = "gumroad"; // generic digital-product marketplace
  const typedPlatform = parsed.data.sourcePlatform.trim();
  const normalized = typedPlatform.toLowerCase().replace(/[\s-]+/g, "_");
  const isKnown = enumValues.includes(normalized);
  const sourcePlatform = (
    isKnown ? normalized : FALLBACK_PLATFORM
  ) as (typeof resellableAssets.sourcePlatform.enumValues)[number];

  // If we fell back, prepend the real platform to notes so it isn't lost.
  const userNotes = parsed.data.notes?.trim() ?? "";
  const notes = isKnown
    ? userNotes
    : [`Source platform (unlisted): ${typedPlatform}`, userNotes].filter(Boolean).join("\n");

  const db = getDb();
  const [asset] = await db
    .insert(resellableAssets)
    .values({
      id: `asset_user_${Date.now()}`,
      sourcePlatform,
      sourceUrl: parsed.data.sourceUrl,
      assetType: parsed.data.assetType as (typeof resellableAssets.assetType.enumValues)[number],
      title: parsed.data.title,
      askingPriceUsd: parsed.data.askingPriceUsd,
      monthlyRevenueUsd: parsed.data.monthlyRevenueUsd,
      license: parsed.data.license,
      niche: parsed.data.niche as (typeof resellableAssets.niche.enumValues)[number] | undefined,
      notes,
    })
    .returning();

  return created({ asset });
}
