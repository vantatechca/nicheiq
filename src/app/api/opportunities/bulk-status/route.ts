// src/app/api/opportunities/bulk-status/route.ts
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/response";

type OppStatus = (typeof opportunities.status.enumValues)[number];

export async function POST(req: Request) {
  // Auth: middleware excludes /api/*, so every mutating route must guard itself.
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: { ids?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { ids, status } = body;
  if (!Array.isArray(ids) || ids.length === 0 || typeof status !== "string") {
    return NextResponse.json({ error: "ids[] and status are required" }, { status: 400 });
  }
  if (!opportunities.status.enumValues.includes(status as OppStatus)) {
    return NextResponse.json({ error: `invalid status: ${status}` }, { status: 400 });
  }

  const db = getDb();
  const updated = await db
    .update(opportunities)
    .set({ status: status as OppStatus, updatedAt: new Date() })
    .where(inArray(opportunities.id, ids as string[]))
    .returning({ id: opportunities.id });

  return NextResponse.json({ updated: updated.length });
}