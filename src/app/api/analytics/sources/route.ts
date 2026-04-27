import { NextRequest } from "next/server";
import { mockSources } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const rows = [...mockSources]
    .sort((a, b) => b.itemsTracked - a.itemsTracked)
    .map((s) => ({ id: s.id, label: s.label, sourcePlatform: s.sourcePlatform, itemsTracked: s.itemsTracked }));
  return ok({ contribution: rows });
}
