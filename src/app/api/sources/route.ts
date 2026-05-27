import { NextRequest } from "next/server";
import { z } from "zod";
import { listSources, createSource } from "@/lib/repos/sources";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

const newSourceSchema = z.object({
  sourcePlatform: z.string().min(1),
  label: z.string().min(2),
  config: z.record(z.unknown()).optional(),
  cronSchedule: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const rows = await listSources();
  return ok({ sources: rows });
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
  const parsed = newSourceSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const source = await createSource(parsed.data);
  return created({ source });
}