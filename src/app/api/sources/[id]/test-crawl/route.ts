import { NextRequest } from "next/server";
import { mockSources } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const s = mockSources.find((x) => x.id === params.id);
  if (!s) return notFound();
  return ok({
    job: {
      id: `crawl_${Date.now()}`,
      sourceId: s.id,
      status: "queued",
      startedAt: new Date().toISOString(),
      itemsFound: 0,
      itemsNew: 0,
    },
  });
}
