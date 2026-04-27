import { NextRequest } from "next/server";
import { mockSources } from "@/mock/data";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { z } from "zod";

const newSourceSchema = z.object({
  sourcePlatform: z.string().min(1),
  label: z.string().min(2),
  config: z.record(z.unknown()).optional(),
  cronSchedule: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  return ok({ sources: mockSources });
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
  return created({
    source: {
      id: `source_user_${Date.now()}`,
      sourcePlatform: parsed.data.sourcePlatform,
      label: parsed.data.label,
      config: parsed.data.config ?? {},
      enabled: true,
      cronSchedule: parsed.data.cronSchedule ?? "0 */6 * * *",
      lastRunAt: null,
      lastRunStatus: "idle",
      lastError: null,
      itemsTracked: 0,
    },
  });
}
