import { NextRequest } from "next/server";
import { mockGoldenRules } from "@/mock/data";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { ruleSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  return ok({ rules: mockGoldenRules });
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
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return created({
    rule: {
      id: `rule_user_${Date.now()}`,
      ...parsed.data,
      niche: parsed.data.niche ?? null,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    },
  });
}
