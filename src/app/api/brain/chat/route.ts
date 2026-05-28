import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { brainMessageSchema } from "@/lib/utils/validation";
import { assembleContext } from "@/lib/ai/context-assembler";
import type { BrainMode } from "@/lib/ai/context-assembler";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/redis/client";
import { getDb } from "@/lib/db/client";
import { conversations, messages as messagesTable } from "@/lib/db/schema";
import { selectModel, estimateCostUsd, reserveSpend, recordActualSpend } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Canned (mock-mode) responses ─────────────────────────────────────
// Used when USE_MOCK is true OR when ANTHROPIC_API_KEY is missing
// (mock-fallback). Kept verbatim from the previous implementation.

const cannedByMode: Record<BrainMode, string[]> = {
  global: [
    "Three weekend-shaped bets jump out from your active feed:",
    "\n\n**1. Etsy printable bundle for 'aesthetic finance'** (score 87) — search up 220% w/w, low competition pocket. Best matched to your 'boost: weekend builds' rule.",
    "\n\n**2. Notion + Figma hybrid for podcast operators** (score 81) — repeat-buyer market, AI-leveraged. Triggers your 'boost: AI-leveraged' modifier.",
    "\n\n**3. AI prompt pack for cold outreach using Claude** (score 79) — narrow but hot.",
    "\n\nWant me to draft one-pagers for any of these or pressure-test the riskiest one first?",
  ],
  niche: [
    "Looking at this niche through your golden rules:",
    "\n\n• Demand is healthy (top trend keyword up 38% w/w)",
    "\n• Competition is moderate but visually outdated — quality-adjusted competition is lower than raw count suggests",
    "\n• Your 'boost: Notion-adjacent' rule is firing here, +6 to baseline",
    "\n• Recommended next step: review the 3 top creators, identify the 'CRM-lite' add-on gap they all share.",
  ],
  opportunity: [
    "Pressure-testing this opportunity:",
    "\n\n**Where it dies**: distribution. There are 50+ adjacent listings ranking, so trust gap is real.",
    "\n**Mitigation**: ship a vertical-specific cut (indie SaaS founders), not a generic Notion template. Free 5-page sample as a TikTok-friendly demo.",
    "\n**Realistic build effort**: 12–16 days from scratch. The hard part is documentation + Loom walkthroughs.",
    "\n**Pre-commit experiment**: post a 60-second TikTok 'tour' of the weekly review screen with a Stan Store waitlist. Threshold: 100+ waitlist signups in 72 hours. Below 30 = kill or reposition.",
    "\n\nWant me to draft the experiment brief or jump straight to the build plan?",
  ],
  creator: [
    "Reverse-engineering this creator's playbook:",
    "\n\n**Pricing**: three tiers — $9 / $39 / $129. Keystone is the $39 bundle.",
    "\n**Cadence**: weekly drop on Tuesday, TikTok demo on Friday, Discord office hours on Thursday.",
    "\n**Funnel**: Pinterest → email list (free template gated) → bundle.",
    "\n**Differentiation**: bundle stacking — comparing 4 SKUs is harder than 1, masks price sensitivity.",
    "\n**What you'd do differently**: vertical cuts (indie SaaS, agency, podcast) + 'CRM-lite' upsell that buyer comments request but they don't ship.",
  ],
  build_plan: [
    "Drafting a build plan tuned to your weekend cadence:",
    "\n\n**Day 1** — concept lock + 3 reference products + 5 design variants in Figma + draft hero copy",
    "\n**Day 2** — finalize bundle + Gumroad listing + schedule launch tweet thread",
    "\n\nStack: Figma, Gumroad, Pinterest scheduler. Risks: keyword saturation, trademark conflicts.",
    "\n\nMonetization: $9 single + $19 bundle + affiliate via Whop creators.",
    "\nWeek-1 win condition: 10 sales + 5-star avg over 20 reviews.",
  ],
  replicate: [
    "Replication play, with differentiation:",
    "\n\n**What they do**: clean, neutral, single-product page with one upsell.",
    "\n**Differentiation lever**: package as a *workflow* (3 connected templates) rather than a single asset. Buyer-comments request this consistently.",
    "\n**Pricing wedge**: $19 vs. their $9 — defensible because of the workflow narrative.",
    "\n**Hook copy**: 'Stop juggling spreadsheets. One dashboard, three views, your whole month.'",
    "\n\nWant the differentiation grid as a tracked opportunity?",
  ],
  dataset_review: [
    "Dataset review:",
    "\n\n**License**: MIT — clean for commercial wrap.",
    "\n**Repackage angle**: $29/mo searchable webapp + weekly thread digest.",
    "\n**Distribution wedge**: FinTwit threads pulling 5 'mispriced earnings reactions' from the dataset, posted Tuesday + Wednesday.",
    "\n**SEC risk mitigation**: descriptive only, no editorialized 'buy/sell'. Use historical examples in threads.",
    "\n**Build effort**: week-shaped if you skip ML enrichment. Month-shaped with sentiment scoring.",
    "\n\nWant a one-pager covering pricing tiers and milestones?",
  ],
};

async function streamCannedResponse(
  message: string,
  mode: BrainMode,
): Promise<ReadableStream<Uint8Array>> {
  const lines = cannedByMode[mode] ?? cannedByMode.global;
  const acknowledged = `Got it — you said: "${message.slice(0, 160)}${message.length > 160 ? "…" : ""}"\n\n`;
  const fullText = acknowledged + lines.join("");
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const tokens = fullText.match(/[\s\S]{1,3}/g) ?? [];
      for (const t of tokens) {
        controller.enqueue(encoder.encode(t));
        await new Promise((r) => setTimeout(r, 12 + Math.random() * 24));
      }
      controller.close();
    },
  });
}

// ── Live AI streaming ────────────────────────────────────────────────
// Routes through selectModel({tier:3}).streamWithUsage so:
//   1. Provider abstraction is preserved (AGENTS rule).
//   2. The system context goes through `cacheableSystem` — Anthropic
//      ephemeral prompt caching kicks in on the second turn onward,
//      cutting input-token billing on the (large) context to 10%.
//   3. Spend is reconciled with cache-aware pricing from PRICING.

const ESTIMATE_USD = 0.03; // ~2k input + ~1k output, reserved up front

interface LiveStreamOpts {
  cacheableSystem: string;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  signal?: AbortSignal;
  /** Called once the full assistant reply is known (stream complete or aborted). */
  onComplete: (assistantText: string) => Promise<void> | void;
}

async function streamLive(opts: LiveStreamOpts): Promise<ReadableStream<Uint8Array>> {
  const cap = await reserveSpend(ESTIMATE_USD);
  if (!cap.allowed) {
    const capDollars = (cap.capCents / 100).toFixed(2);
    const text = `Daily AI spend cap reached ($${capDollars}). Try again tomorrow or raise the cap in Settings.`;
    return new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(text));
        c.close();
      },
    });
  }

  const tier3 = selectModel({ tier: 3 });
  const { stream: textStream, done: usageDone } = tier3.streamWithUsage({
    cacheableSystem: opts.cacheableSystem,
    messages: [...opts.history, { role: "user", content: opts.message }],
    maxTokens: 1024,
    temperature: 0.3,
    signal: opts.signal,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let assistantText = "";
      let actualUsd = 0;
      try {
        for await (const chunk of textStream) {
          assistantText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        const usage = await usageDone;
        actualUsd = estimateCostUsd(3, usage);
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[stream error: ${(err as Error).message}]`));
        try {
          const usage = await usageDone;
          actualUsd = estimateCostUsd(3, usage);
        } catch {
          /* leave actualUsd at 0; reservation still released below */
        }
      } finally {
        // Reconcile against the reserved estimate. Race-safe via Redis INCRBY.
        await recordActualSpend(ESTIMATE_USD, actualUsd);
        // Persist the assistant reply (even if partial) so the next turn has context.
        try {
          await opts.onComplete(assistantText);
        } catch (persistErr) {
          console.error("[brain/chat] failed to persist assistant message:", persistErr);
        }
        controller.close();
      }
    },
  });
}

// ── DB helpers (live mode only) ──────────────────────────────────────

async function loadHistory(
  conversationId: string,
  userId: string,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const db = getDb();
  // Verify ownership before reading messages so a user can't peek into
  // someone else's conversation by guessing an id.
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!conv) return [];

  const rows = await db
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));

  // The schema role enum includes "system"; only user/assistant turns
  // belong in the model history.
  return rows
    .filter(
      (r): r is { role: "user" | "assistant"; content: string } =>
        r.role === "user" || r.role === "assistant",
    )
    .map((r) => ({ role: r.role, content: r.content }));
}

async function ensureConversation(
  conversationId: string | undefined,
  userId: string,
  brainMode: BrainMode,
): Promise<string> {
  const db = getDb();
  if (conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);
    if (existing) return existing.id;
    // Fall through: the client provided an id we don't own. Create a new one
    // rather than 403 — gentler UX for stale local state.
  }

  const newId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(conversations).values({
    id: newId,
    userId,
    brainMode,
    contextRefs: {},
    title: "New conversation",
  });
  return newId;
}

async function persistMessage(conversationId: string, role: "user" | "assistant", content: string) {
  const db = getDb();
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(messagesTable).values({ id, conversationId, role, content });
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

// ── Route handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // userId MUST be the real users.id — anything else (email, "anon") will
  // violate the conversations.user_id FK (-> users.id ON DELETE CASCADE) and
  // crash the insert with a confusing PG error mid-stream. Earlier code had
  // `session.user.id ?? session.user.email ?? "anon"`, which silently masked
  // the real failure mode (a session without id should be rejected, not
  // patched). With the strict check below, any session that didn't make it
  // through the JWT callback cleanly gets a clean 401 here.
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "Session is missing user id",
        message: "Please sign out and sign back in.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rate limit: 10/min per user. Returns null when Redis isn't configured.
  const limiter = getRateLimiter({ limit: 10, window: "1 m", key: "brain-chat" });
  if (limiter) {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Slow down — Brain takes a breath. Try again in a few seconds.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
          },
        },
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const parsed = brainMessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid body", details: parsed.error.flatten() }),
      { status: 400 },
    );
  }

  // Live mode requires BOTH USE_MOCK=false and a configured AI key. If the
  // operator set USE_MOCK=false but forgot the key, fall back to canned
  // output and surface the misconfig via response headers.
  const wantsLive = process.env.USE_MOCK === "false";
  const hasAiKey = !!process.env.ANTHROPIC_API_KEY;
  const useReal = wantsLive && hasAiKey;
  const aiMode = useReal ? "live" : wantsLive && !hasAiKey ? "mock-fallback" : "mock";

  let conversationId: string;
  let stream: ReadableStream<Uint8Array>;

  if (useReal) {
    // 1. Resolve or create a conversation
    conversationId = await ensureConversation(parsed.data.conversationId, userId, parsed.data.mode);

    // 2. Load prior turns — fix for the "Brain has no memory" bug
    const history = await loadHistory(conversationId, userId);

    // 3. Persist the user message immediately so it survives a crash mid-stream
    await persistMessage(conversationId, "user", parsed.data.message);

    // 4. Stream the assistant response, persisting on completion
    const cacheableSystem = await assembleContext({
      mode: parsed.data.mode,
      refIds: parsed.data.contextRefs,
      userId,
    });
    stream = await streamLive({
      cacheableSystem,
      history,
      message: parsed.data.message,
      signal: req.signal,
      onComplete: async (assistantText) => {
        if (assistantText.trim().length > 0) {
          await persistMessage(conversationId, "assistant", assistantText);
        }
      },
    });
  } else {
    // Mock / fallback: don't touch the DB. ConversationId is decorative here.
    conversationId = parsed.data.conversationId ?? `conv_${Date.now()}`;
    stream = await streamCannedResponse(parsed.data.message, parsed.data.mode);
  }

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "x-conversation-id": conversationId,
    "x-ai-mode": aiMode,
  };
  if (aiMode === "mock-fallback") {
    headers["x-ai-warning"] =
      "USE_MOCK=false but ANTHROPIC_API_KEY is missing — serving canned responses.";
  }

  return new Response(stream, { headers });
}