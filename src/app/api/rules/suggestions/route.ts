import { NextRequest } from "next/server";
import { mockFeedbackPatterns } from "@/mock/data";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  // Phase F will derive these dynamically. For now return mock patterns.
  return ok({ suggestions: mockFeedbackPatterns });
}
