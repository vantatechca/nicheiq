import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, params.id)).limit(1);

  if (!product) return notFound("Product not found");
  return ok({ product });
}
