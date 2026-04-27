import { NextRequest } from "next/server";
import { mockResellable } from "@/mock/data";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { resellableSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const status = req.nextUrl.searchParams.get("status");
  const rows = status ? mockResellable.filter((r) => r.status === status) : mockResellable;
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
  return created({
    asset: {
      id: `asset_user_${Date.now()}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    },
  });
}
