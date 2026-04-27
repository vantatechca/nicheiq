import { NextRequest } from "next/server";
import { mockConversations } from "@/mock/data";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { z } from "zod";

const newConvSchema = z.object({
  brainMode: z.enum([
    "global",
    "niche",
    "opportunity",
    "creator",
    "build_plan",
    "replicate",
    "dataset_review",
  ]),
  contextRefs: z.record(z.unknown()).optional(),
  title: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  return ok({ conversations: mockConversations.filter((c) => c.userId === session.user.id || c.userId === "user_andrei") });
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
  const parsed = newConvSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());
  return created({
    conversation: {
      id: `conv_${Date.now()}`,
      userId: session.user.id,
      brainMode: parsed.data.brainMode,
      contextRefs: parsed.data.contextRefs ?? {},
      title: parsed.data.title ?? "New conversation",
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
    },
  });
}
