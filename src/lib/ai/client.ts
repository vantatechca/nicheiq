/**
 * Multi-tier AI client factory.
 *
 * Tier 1 — bulk classification / extraction (Qwen via OpenRouter).
 * Tier 2 — per-product analysis (Claude Haiku 4.5).
 * Tier 3 — strategic synthesis: Brain chat, digests (Claude Sonnet 4.6).
 *
 * Each tier exposes a uniform `complete()` and `stream()` method.
 * Anthropic tiers (2, 3) additionally support:
 *   - `cacheableSystem` for prompt caching (90% savings on repeated prefixes)
 *   - `signal` to abort the upstream call when the client disconnects
 *
 * Env vars are validated lazily — calling tier 1 without OPENROUTER_API_KEY
 * throws only when tier 1 is invoked, not at module load.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";

// ── Lazy singleton clients ───────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      maxRetries: 2,
    });
  }
  return _anthropic;
}

let _openrouter: OpenAI | null = null;
function openrouter(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: { "X-Title": "NicheIQ" },
    });
  }
  return _openrouter;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} missing`);
  return v;
}

// ── Public types ─────────────────────────────────────────────────────
export type AiTier = 1 | 2 | 3;

export interface AiCallOptions {
  system?: string;
  cacheableSystem?: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface AiCompleteResult {
  text: string;
  usage?: AiUsage;
}

export interface AiClient {
  tier: AiTier;
  modelId: string;
  complete(opts: AiCallOptions): Promise<AiCompleteResult>;
  stream(opts: AiCallOptions): AsyncIterable<string>;
}

const MODELS = {
  1: { provider: "openrouter", id: "qwen/qwen-2.5-72b-instruct" },
  2: { provider: "anthropic", id: "claude-haiku-4-5" },
  3: { provider: "anthropic", id: "claude-sonnet-4-6" },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────
function buildAnthropicSystem(opts: AiCallOptions) {
  if (opts.cacheableSystem) {
    return [
      {
        type: "text" as const,
        text: opts.cacheableSystem,
        cache_control: { type: "ephemeral" as const },
      },
      ...(opts.system ? [{ type: "text" as const, text: opts.system }] : []),
    ];
  }
  return opts.system;
}

function isTextBlock(b: Anthropic.ContentBlock): b is Anthropic.TextBlock {
  return b.type === "text";
}

// SDK 0.32 doesn't type the prompt-caching usage fields, but the API returns
// them at runtime. Cast through a widened type. Bump the SDK to drop this.
type UsageWithCache = Anthropic.Usage & {
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

function toAiUsage(u: Anthropic.Usage): AiUsage {
  const w = u as UsageWithCache;
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheCreationInputTokens: w.cache_creation_input_tokens ?? undefined,
    cacheReadInputTokens: w.cache_read_input_tokens ?? undefined,
  };
}

// ── Factory ──────────────────────────────────────────────────────────
export function selectModel({ tier }: { tier: AiTier; task?: string }): AiClient {
  const model = MODELS[tier];

  if (model.provider === "anthropic") {
    return {
      tier,
      modelId: model.id,
      async complete(opts) {
        const res = await anthropic().messages.create(
          {
            model: model.id,
            system: buildAnthropicSystem(opts),
            messages: opts.messages,
            max_tokens: opts.maxTokens ?? 1024,
            temperature: opts.temperature ?? 0.3,
          },
          { signal: opts.signal },
        );
        return {
          text: res.content.filter(isTextBlock).map((c) => c.text).join(""),
          usage: toAiUsage(res.usage),
        };
      },
      async *stream(opts) {
        const stream = await anthropic().messages.create(
          {
            model: model.id,
            system: buildAnthropicSystem(opts),
            messages: opts.messages,
            max_tokens: opts.maxTokens ?? 1024,
            temperature: opts.temperature ?? 0.3,
            stream: true,
          },
          { signal: opts.signal },
        );
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield event.delta.text;
          }
        }
      },
    };
  }

  return {
    tier,
    modelId: model.id,
    async complete(opts) {
      const res = await openrouter().chat.completions.create(
        {
          model: model.id,
          messages: toOpenAiMessages(opts),
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
        },
        { signal: opts.signal },
      );
      return {
        text: res.choices[0]?.message?.content ?? "",
        usage: res.usage
          ? { inputTokens: res.usage.prompt_tokens, outputTokens: res.usage.completion_tokens }
          : undefined,
      };
    },
    async *stream(opts) {
      const stream = await openrouter().chat.completions.create(
        {
          model: model.id,
          messages: toOpenAiMessages(opts),
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
          stream: true,
        },
        { signal: opts.signal },
      );
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}

function toOpenAiMessages(opts: AiCallOptions) {
  return [
    ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
    ...opts.messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
  ];
}

// ── Spend cap (atomic, integer cents) ────────────────────────────────

function spendKey() {
  return `nicheiq:ai:spend_cents:${new Date().toISOString().slice(0, 10)}`;
}

function capCents() {
  return Math.round(Number(process.env.AI_DAILY_SPEND_CAP ?? 5) * 100);
}

export async function reserveSpend(estimateUsd: number): Promise<{
  allowed: boolean;
  spentCents: number;
  capCents: number;
}> {
  const cap = capCents();
  if (!redis) return { allowed: true, spentCents: 0, capCents: cap };

  const estimateCents = Math.max(0, Math.round(estimateUsd * 100));
  const key = spendKey();
  const newTotal = await redis.incrby(key, estimateCents);
  await redis.expire(key, 60 * 60 * 26);

  if (newTotal > cap) {
    await redis.incrby(key, -estimateCents);
    return { allowed: false, spentCents: newTotal - estimateCents, capCents: cap };
  }
  return { allowed: true, spentCents: newTotal, capCents: cap };
}

export async function recordActualSpend(estimateUsd: number, actualUsd: number) {
  if (!redis) return;
  const deltaCents = Math.round((actualUsd - estimateUsd) * 100);
  if (deltaCents === 0) return;
  const key = spendKey();
  await redis.incrby(key, deltaCents);
  await redis.expire(key, 60 * 60 * 26);
}

export async function getSpendStatus(): Promise<{ spentCents: number; capCents: number }> {
  const cap = capCents();
  if (!redis) return { spentCents: 0, capCents: cap };
  const v = (await redis.get<number>(spendKey())) ?? 0;
  return { spentCents: v, capCents: cap };
}

// ── Backward-compat shims ────────────────────────────────────────────
// The old API expected dollars, not cents, and a non-atomic record.
// Existing route handlers (e.g. /api/brain/chat) use these.
// New code should prefer reserveSpend + recordActualSpend.

/** @deprecated Use reserveSpend + recordActualSpend for race-safe accounting. */
export async function checkSpendCap(): Promise<{ allowed: boolean; spent: number; cap: number }> {
  const s = await getSpendStatus();
  return {
    allowed: s.spentCents < s.capCents,
    spent: s.spentCents / 100,
    cap: s.capCents / 100,
  };
}

/** @deprecated Use recordActualSpend(estimate, actual) for proper reconciliation. */
export async function recordSpend(usd: number): Promise<void> {
  if (!redis) return;
  const cents = Math.round(usd * 100);
  if (cents === 0) return;
  const key = spendKey();
  await redis.incrby(key, cents);
  await redis.expire(key, 60 * 60 * 26);
}