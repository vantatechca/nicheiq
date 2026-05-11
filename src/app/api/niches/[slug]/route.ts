import { NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  niches,
  opportunities,
  products,
  creators,
  trends,
  signals,
} from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const slug = params.slug as typeof niches.slug.enumValues[number];

  // First fetch the niche so we can 404 fast if it doesn't exist.
  // Avoids running 5 expensive parallel queries on an invalid slug.
  const [n] = await db.select().from(niches).where(eq(niches.slug, slug)).limit(1);
  if (!n) return notFound("Niche not found");

  // Now fan out the related-data fetches in parallel. This is the kind of
  // query that takes ~600ms serial and ~150ms with Promise.all.
  const [oppsRows, productsRows, creatorsRows, trendsRows, signalsRows] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .where(eq(opportunities.niche, slug))
      .orderBy(desc(opportunities.score)),

    db
      .select()
      .from(products)
      .where(eq(products.niche, slug))
      .limit(24),

    // creators.niches is text[] — `arrayContains` produces:
    //   WHERE creators.niches @> ARRAY[slug]
    db
      .select()
      .from(creators)
      .where(sql`${creators.niches} @> ARRAY[${slug}]::text[]`),

    db.select().from(trends).where(eq(trends.niche, slug)),

    db
      .select()
      .from(signals)
      .where(eq(signals.niche, slug))
      .orderBy(desc(signals.score))
      .limit(24),
  ]);

  return ok({
    niche: n,
    opportunities: oppsRows,
    products: productsRows,
    creators: creatorsRows,
    trends: trendsRows,
    signals: signalsRows,
  });
}