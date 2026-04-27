import { NextRequest } from "next/server";
import { mockDigests } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const cadence = req.nextUrl.searchParams.get("cadence");
  const rows = cadence ? mockDigests.filter((d) => d.cadence === cadence) : mockDigests;
  return ok({ digests: rows });
}
