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

export interface AiStreamWithUsage {
  /** Text chunks. Iterate to forward to the client. */
  stream: AsyncIterable<string>;
  /** Resolves with final usage after the stream completes (or aborts). Never rejects. */
  done: Promise<AiUsage>;
}

export interface AiClient {
  tier: AiTier;
  modelId: string;
  complete(opts: AiCallOptions): Promise<AiCompleteResult>;
  stream(opts: AiCallOptions): AsyncIterable<string>;
  /**
   * Like stream() but also returns a `done` promise with usage stats.
   * Use this for any billed call so spend reconciliation can run.
   */
  streamWithUsage(opts: AiCallOptions): AiStreamWithUsage;
}

const MODELS = {
  1: { provider: "openrouter", id: "qwen/qwen-2.5-72b-instruct" },
  2: { provider: "anthropic", id: "claude-haiku-4-5" },
  3: { provider: "anthropic", id: "claude-sonnet-4-6" },
} as const;

// ── Pricing (single source of truth) ─────────────────────────────────
// USD per million tokens. Cache write/read are multipliers applied to the
// input rate (Anthropic: cache write 1.25×, cache read 0.1×). Update when
// provider list prices change — every cost calc in the app pulls from here.
export const PRICING: Record<
  AiTier,
  { input: number; output: number; cacheWriteMult: number; cacheReadMult: number }
> = {
  1: { input: 0.4, output: 0.4, cacheWriteMult: 0, cacheReadMult: 0 },
  2: { input: 1, output: 5, cacheWriteMult: 1.25, cacheReadMult: 0.1 },
  3: { input: 3, output: 15, cacheWriteMult: 1.25, cacheReadMult: 0.1 },
};

export function estimateCostUsd(tier: AiTier, usage: AiUsage): number {
  const p = PRICING[tier];
  const inputCost = usage.inputTokens * p.input;
  const outputCost = usage.outputTokens * p.output;
  const cacheWriteCost = (usage.cacheCreationInputTokens ?? 0) * p.input * p.cacheWriteMult;
  const cacheReadCost = (usage.cacheReadInputTokens ?? 0) * p.input * p.cacheReadMult;
  return (inputCost + outputCost + cacheWriteCost + cacheReadCost) / 1_000_000;
}

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
          text: res.content
            .filter(isTextBlock)
            .map((c) => c.text)
            .join(""),
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
      streamWithUsage(opts) {
        let resolveUsage!: (u: AiUsage) => void;
        const done = new Promise<AiUsage>((res) => {
          resolveUsage = res;
        });
        const acc: AiUsage = { inputTokens: 0, outputTokens: 0 };

        const stream = (async function* () {
          try {
            const upstream = await anthropic().messages.create(
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

            for await (const event of upstream) {
              if (event.type === "message_start") {
                const u = event.message.usage as UsageWithCache;
                acc.inputTokens = u.input_tokens;
                acc.cacheCreationInputTokens = u.cache_creation_input_tokens ?? undefined;
                acc.cacheReadInputTokens = u.cache_read_input_tokens ?? undefined;
              } else if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                yield event.delta.text;
              } else if (event.type === "message_delta") {
                acc.outputTokens = event.usage.output_tokens;
              }
            }
          } finally {
            // Always resolve — partial usage on abort is better than a hung promise.
            resolveUsage(acc);
          }
        })();

        return { stream, done };
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
    streamWithUsage(opts) {
      let resolveUsage!: (u: AiUsage) => void;
      const done = new Promise<AiUsage>((res) => {
        resolveUsage = res;
      });
      const acc: AiUsage = { inputTokens: 0, outputTokens: 0 };

      const stream = (async function* () {
        try {
          const upstream = await openrouter().chat.completions.create(
            {
              model: model.id,
              messages: toOpenAiMessages(opts),
              max_tokens: opts.maxTokens ?? 1024,
              temperature: opts.temperature ?? 0.3,
              stream: true,
              stream_options: { include_usage: true },
            },
            { signal: opts.signal },
          );
          for await (const chunk of upstream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) yield text;
            // Usage arrives in the final chunk when include_usage is set.
            if (chunk.usage) {
              acc.inputTokens = chunk.usage.prompt_tokens;
              acc.outputTokens = chunk.usage.completion_tokens;
            }
          }
        } finally {
          resolveUsage(acc);
        }
      })();

      return { stream, done };
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

// Atomic reserve-or-deny in a single round-trip. Previously this did two
// separate Redis commands: INCRBY +estimate, then conditionally INCRBY
// -estimate to roll back if we'd gone over cap. Between those two commands
// another concurrent request could observe the inflated total and either
// falsely deny itself or, under burst load, let multiple requests slip
// through above the cap before the rollbacks settled.
//
// The Lua script below runs server-side as a single atomic operation:
//   GET current → compare current+estimate vs cap → SET only if under cap.
// No window for a concurrent call to see an inflated transient state.
//
// The EXPIRE is set inside the script too, so a fresh key always picks up
// the 26h TTL on its first successful reservation.
const RESERVE_LUA = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local estimate = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local newTotal = current + estimate
if newTotal > cap then
  return {0, current, cap}
end
redis.call('SET', KEYS[1], newTotal)
redis.call('EXPIRE', KEYS[1], 93600)
return {1, newTotal, cap}
`;

export async function reserveSpend(estimateUsd: number): Promise<{
  allowed: boolean;
  spentCents: number;
  capCents: number;
}> {
  const cap = capCents();
  if (!redis) return { allowed: true, spentCents: 0, capCents: cap };

  const estimateCents = Math.max(0, Math.round(estimateUsd * 100));
  const key = spendKey();

  // Returns [allowedFlag, totalAfterCall, capUsedByScript].
  // allowedFlag: 1 = reserved, 0 = denied (over cap).
  // totalAfterCall: post-script total in cents. On deny this is the pre-call
  // value (untouched); on allow it's the new running total.
  const result = (await redis.eval(RESERVE_LUA, [key], [estimateCents, cap])) as [
    number,
    number,
    number,
  ];
  const allowed = result[0] === 1;
  const newTotal = result[1];

  return { allowed, spentCents: newTotal, capCents: cap };
}

export async function recordActualSpend(estimateUsd: number, actualUsd: number) {
  if (!redis) return;
  const deltaCents = Math.round((actualUsd - estimateUsd) * 100);
  if (deltaCents === 0) return;
  const key = spendKey();
  // Reconciliation is fine as plain INCRBY — a single atomic command, and a
  // small over- or under-shoot across the day is acceptable (the cap is a
  // soft fence around heavy days, not an accountant's ledger).
  await redis.incrby(key, deltaCents);
  await redis.expire(key, 60 * 60 * 26);
}

export async function getSpendStatus(): Promise<{ spentCents: number; capCents: number }> {
  const cap = capCents();
  if (!redis) return { spentCents: 0, capCents: cap };
  const v = (await redis.get<number>(spendKey())) ?? 0;
  return { spentCents: v, capCents: cap };
}