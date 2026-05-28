// src/lib/ai/anthropic-errors.ts
//
// Classifies errors thrown by the Anthropic SDK (v0.32.x) into a small set of
// kinds, plus a user-safe message. The case that bit us: the monthly spend cap
// comes back as a 400 invalid_request_error (NOT a 429), so it arrives as a
// BadRequestError and looks identical to a genuine malformed-request bug unless
// we sniff the message text. Tuned for NicheIQ's plain-text Brain stream: the
// route enqueues `userMessage` straight into the chat bubble, the same way the
// daily-spend-cap notice already does.
//
// NOTE: SDK 0.32.x exposes the request id as `request_id` (snake_case). Newer
// SDKs renamed it to `requestID` — if you bump the SDK, update readRequestId().

import Anthropic from "@anthropic-ai/sdk";

export type AnthropicErrorKind =
  | "usage_limit" // Anthropic-account spend cap hit — resets on a date
  | "rate_limit" // 429 — too many requests, retry after a short wait
  | "auth" // 401 / 403 — bad, expired, or wrong-workspace key
  | "overloaded" // 529 — Anthropic capacity, retryable with backoff
  | "server" // 5xx — transient upstream failure, retryable
  | "timeout" // connection timed out
  | "connection" // couldn't reach the API at all
  | "aborted" // request cancelled (client disconnected)
  | "invalid_request" // a real 400 — a bug in our payload, NOT a billing cap
  | "unknown";

export interface ClassifiedError {
  kind: AnthropicErrorKind;
  /** Safe to stream to the user. Never contains raw API text. */
  userMessage: string;
  /** Whether the caller should offer/attempt a retry. */
  retryable: boolean;
  /** ISO string of when access returns, if the API told us (usage_limit). */
  resetsAt?: string;
  /** HTTP status, for any JSON-response path (health checks etc.). */
  httpStatus: number;
  /** Anthropic request id — log it, quote to support; never show users. */
  requestId?: string;
  /** Raw upstream message — server logs ONLY, never the client. */
  raw?: string;
}

function readRequestId(err: InstanceType<typeof Anthropic.APIError>): string | undefined {
  // 0.32.x exposes `request_id`; newer SDKs use `requestID`. Read both so this
  // survives an SDK bump. (API errors reliably populate this, so no header
  // fallback is needed.)
  const e = err as unknown as { request_id?: string | null; requestID?: string | null };
  return e.request_id ?? e.requestID ?? undefined;
}

/** Anthropic's body is { type: "error", error: { type, message } }. Be defensive. */
function readApiMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as unknown;
  if (typeof body === "string") return body;
  const outer = (body ?? {}) as { message?: string; error?: { message?: string } };
  return outer.error?.message ?? outer.message ?? err.message ?? "";
}

function extractResetDate(message: string): string | undefined {
  // "You will regain access on 2026-06-01 at 00:00 UTC."
  const m = message.match(
    /regain access on (\d{4}-\d{2}-\d{2})(?:\s+at\s+(\d{1,2}:\d{2})(?::(\d{2}))?\s*(?:UTC)?)?/i,
  );
  if (!m) return undefined;
  const [, date, time = "00:00", secs = "00"] = m;
  const d = new Date(`${date}T${time}:${secs}Z`); // API states the time in UTC
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function isUsageLimit(message: string): boolean {
  return /usage limit/i.test(message) || /regain access/i.test(message);
}

export function classifyAnthropicError(err: unknown): ClassifiedError {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    const requestId = readRequestId(err);
    const raw = readApiMessage(err);

    // Spend / monthly usage cap. Returns as a 400 — MUST be checked before any
    // generic 400 handling, or it gets mislabeled as a request bug.
    if (status === 400 && isUsageLimit(raw)) {
      const resetsAt = extractResetDate(raw);
      return {
        kind: "usage_limit",
        userMessage: resetsAt
          ? `Brain is paused — the monthly AI usage limit was reached. It comes back on ${formatReset(resetsAt)}.`
          : "Brain is paused because the monthly AI usage limit was reached.",
        retryable: false,
        resetsAt,
        httpStatus: 503,
        requestId,
        raw,
      };
    }

    if (err instanceof Anthropic.RateLimitError || status === 429) {
      return {
        kind: "rate_limit",
        userMessage: "Brain is getting a lot of requests right now — give it a few seconds and try again.",
        retryable: true,
        httpStatus: 429,
        requestId,
        raw,
      };
    }

    if (
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.PermissionDeniedError ||
      status === 401 ||
      status === 403
    ) {
      // Almost always a key misconfig on our side — generic message to the
      // user, loud log for us.
      return {
        kind: "auth",
        userMessage: "Brain is temporarily unavailable. Please try again later.",
        retryable: false,
        httpStatus: 503,
        requestId,
        raw,
      };
    }

    if (status === 529) {
      return {
        kind: "overloaded",
        userMessage: "Brain is busy at the moment. Please try again in a minute.",
        retryable: true,
        httpStatus: 503,
        requestId,
        raw,
      };
    }

    if (status >= 500) {
      return {
        kind: "server",
        userMessage: "Brain hit a temporary error. Please try again.",
        retryable: true,
        httpStatus: 502,
        requestId,
        raw,
      };
    }

    if (status === 400) {
      // A genuine bad request — our payload is wrong. A bug to fix, not an
      // outage; not retryable. Keep the user message generic.
      return {
        kind: "invalid_request",
        userMessage: "Something went wrong with that request. Please try again.",
        retryable: false,
        httpStatus: 400,
        requestId,
        raw,
      };
    }

    return {
      kind: "unknown",
      userMessage: "Brain is temporarily unavailable. Please try again.",
      retryable: true,
      httpStatus: 502,
      requestId,
      raw,
    };
  }

  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      kind: "timeout",
      userMessage: "Brain took too long to respond. Please try again.",
      retryable: true,
      httpStatus: 504,
      raw: (err as Error).message,
    };
  }
  if (err instanceof Anthropic.APIUserAbortError) {
    return {
      kind: "aborted",
      userMessage: "The request was cancelled.",
      retryable: true,
      httpStatus: 499,
      raw: (err as Error).message,
    };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return {
      kind: "connection",
      userMessage: "Couldn't reach Brain. Please try again.",
      retryable: true,
      httpStatus: 502,
      raw: (err as Error).message,
    };
  }

  return {
    kind: "unknown",
    userMessage: "Something went wrong. Please try again.",
    retryable: true,
    httpStatus: 500,
    raw: err instanceof Error ? err.message : String(err),
  };
}

/** Human-friendly reset string, e.g. "Jun 1, 2026, 12:00 AM UTC". */
export function formatReset(iso: string): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(iso)) + " UTC"
    );
  } catch {
    return iso;
  }
}