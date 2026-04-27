/**
 * Multi-tier AI client factory.
 *
 * Tier 1 — bulk classification / extraction. Cheap, fast (Kimi/Qwen via OpenRouter).
 * Tier 2 — per-product analysis (Claude Haiku 4.5).
 * Tier 3 — strategic synthesis: Brain chat, digests (Claude Sonnet 4).
 *
 * Each tier exposes a uniform `complete()` method that returns text and a
 * `stream()` method that returns an async iterator of token chunks.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AiTier = 1 | 2 | 3;

export interface AiCallOptions {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface AiClient {
  tier: AiTier;
  modelId: string;
  complete(opts: AiCallOptions): Promise<string>;
  stream(opts: AiCallOptions): AsyncIterable<string>;
}

const MODELS = {
  1: { provider: "openrouter", id: "qwen/qwen-2.5-72b-instruct" },
  2: { provider: "anthropic", id: "claude-haiku-4-5" },
  3: { provider: "anthropic", id: "claude-sonnet-4-6" },
} as const;

function anthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  return new Anthropic({ apiKey });
}

function openrouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "X-Title": "NicheIQ" },
  });
}

export function selectModel({ tier }: { tier: AiTier; task?: string }): AiClient {
  const model = MODELS[tier];
  if (model.provider === "anthropic") {
    return {
      tier,
      modelId: model.id,
      async complete(opts) {
        const res = await anthropic().messages.create({
          model: model.id,
          system: opts.system,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
        });
        return res.content
          .filter((c) => c.type === "text")
          .map((c) => (c as { text: string }).text)
          .join("");
      },
      async *stream(opts) {
        const stream = await anthropic().messages.stream({
          model: model.id,
          system: opts.system,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield event.delta.text;
          }
        }
      },
    };
  }
  // OpenAI-compatible (OpenRouter)
  return {
    tier,
    modelId: model.id,
    async complete(opts) {
      const res = await openrouter().chat.completions.create({
        model: model.id,
        messages: [
          ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
          ...opts.messages,
        ],
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.3,
      });
      return res.choices[0]?.message?.content ?? "";
    },
    async *stream(opts) {
      const stream = await openrouter().chat.completions.create({
        model: model.id,
        messages: [
          ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
          ...opts.messages,
        ],
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.3,
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}

/**
 * Cost-cap guard for Tier 3 — wraps an Upstash counter when configured.
 */
export async function checkSpendCap(): Promise<{ allowed: boolean; spent?: number; cap: number }> {
  const cap = Number(process.env.AI_DAILY_SPEND_CAP ?? 5);
  // Without Upstash, fall back to allow.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: true, cap };
  }
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const key = `nicheiq:ai:spend:${new Date().toISOString().slice(0, 10)}`;
    const spent = ((await redis.get(key)) as number | null) ?? 0;
    return { allowed: spent < cap, spent, cap };
  } catch {
    return { allowed: true, cap };
  }
}

export async function recordSpend(usd: number) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return;
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const key = `nicheiq:ai:spend:${new Date().toISOString().slice(0, 10)}`;
    await redis.incrbyfloat(key, usd);
    await redis.expire(key, 60 * 60 * 26);
  } catch {
    /* non-fatal */
  }
}
