import { NextRequest } from "next/server";
import { brainMessageSchema } from "@/lib/utils/validation";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const cannedByMode: Record<string, string[]> = {
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

async function streamCannedResponse(message: string, mode: string): Promise<ReadableStream<Uint8Array>> {
  const lines = cannedByMode[mode] ?? cannedByMode.global!;
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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const parsed = brainMessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid body", details: parsed.error.flatten() }), {
      status: 400,
    });
  }

  const stream = await streamCannedResponse(parsed.data.message, parsed.data.mode);
  const conversationId = parsed.data.conversationId ?? `conv_${Date.now()}`;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-conversation-id": conversationId,
    },
  });
}
