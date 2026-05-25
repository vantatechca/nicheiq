/**
 * Diagnostic — pings the Tier-1 model (Qwen via OpenRouter) directly and prints
 * either the reply or the REAL error, which the niche classifier's catch block
 * otherwise swallows. Use this to find out why classification is falling back.
 *
 * OPT-IN: skipped unless RUN_LIVE_CRAWL=1. Reads OPENROUTER_API_KEY from
 * .env.local (loaded by vitest.setup.ts).
 *
 *   $env:RUN_LIVE_CRAWL=1; npx vitest run src/lib/ai/__tests__/openrouter-ping.live.test.ts
 *
 * Read the printed error:
 *   "Missing required env var: OPENROUTER_API_KEY" → key isn't in .env.local
 *   401 / "No auth credentials"                    → key is wrong/expired
 *   402 / "Insufficient credits"                   → add credits at openrouter.ai/credits
 *   404 / "not a valid model"                      → the model id is stale (tell me)
 */
import { describe, it } from "vitest";
import { selectModel } from "@/lib/ai/client";

const ENABLED = process.env.RUN_LIVE_CRAWL === "1";

describe.skipIf(!ENABLED)("openrouter tier-1 ping", () => {
  it("calls tier 1 and prints the reply or the real error", async () => {
    try {
      const model = selectModel({ tier: 1 });
      const { text } = await model.complete({
        system: "Reply with exactly one word.",
        messages: [{ role: "user", content: "Say hello." }],
        maxTokens: 10,
        temperature: 0,
      });
      // eslint-disable-next-line no-console
      console.log("[openrouter] OK →", JSON.stringify(text));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[openrouter] FAILED →", err);
      throw err;
    }
  }, 30_000);
});