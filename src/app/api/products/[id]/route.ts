import { NextRequest } from "next/server";
import { findProduct } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const product = findProduct(params.id);
  if (!product) return notFound();
  return ok({ product });
}
