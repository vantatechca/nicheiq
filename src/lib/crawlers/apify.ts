/**
 * Apify actor runner using the async (start + poll + fetch dataset) pattern.
 *
 * Why not the simpler `run-sync-get-dataset-items` endpoint: that blocks the
 * HTTP request for the entire actor run. If the client aborts (timeout,
 * Inngest step timeout, deploy rollover), the Apify run keeps running and
 * billing because there's no run ID exposed to us to abort. With the async
 * pattern we get the run ID up front, poll status, and on ANY exit path
 * (caller abort, our own client budget, network error mid-poll) we POST
 * /abort so the Apify run actually stops server-side too.
 *
 * Same external behavior as the previous direct-fetch calls (returns an
 * array of items), so etsy.ts / gumroad.ts only swap their fetch block.
 */

const APIFY_BASE = "https://api.apify.com/v2";

export interface RunApifyActorOpts {
  actorId: string;
  token: string;
  input: Record<string, unknown>;
  /** Apify-side run timeout in seconds. Apify auto-aborts the run after this. Default 120. */
  runTimeoutSecs?: number;
  /** Memory in MB for the run. Default 512. */
  memoryMbytes?: number;
  /**
   * Overall client budget. If the run hasn't reached a terminal status by
   * then, we POST /abort and throw. Should comfortably exceed runTimeoutSecs
   * so Apify's own server-side timeout normally fires first. Default 150_000.
   */
  clientBudgetMs?: number;
  /** Polling interval in ms while the run is RUNNING/READY. Default 2000. */
  pollIntervalMs?: number;
  /** Upstream cancellation. If signaled, we POST /abort and throw. */
  signal?: AbortSignal;
  /** Optional tag for log lines so the two crawlers stay distinguishable. */
  label?: string;
}

export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "ABORTING"
  | "ABORTED"
  | "TIMING-OUT"
  | "TIMED-OUT";

interface ApifyRunInfo {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
}

export interface ApifyRunResult<T> {
  items: T[];
  runId: string;
  status: ApifyRunStatus;
}

export async function runApifyActor<T = unknown>(
  opts: RunApifyActorOpts,
): Promise<ApifyRunResult<T>> {
  const {
    actorId,
    token,
    input,
    runTimeoutSecs = 120,
    memoryMbytes = 512,
    clientBudgetMs = 150_000,
    pollIntervalMs = 2000,
    signal,
    label = "apify",
  } = opts;

  // 1. Start the run. Returns immediately with the run ID + dataset ID.
  const startUrl = new URL(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`);
  startUrl.searchParams.set("token", token);
  startUrl.searchParams.set("timeout", String(runTimeoutSecs));
  startUrl.searchParams.set("memory", String(memoryMbytes));

  const startRes = await fetch(startUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!startRes.ok) {
    throw new Error(`[${label}] Apify run start failed: HTTP ${startRes.status}`);
  }

  const startJson = (await startRes.json()) as { data: ApifyRunInfo };
  const runId = startJson.data.id;
  const datasetId = startJson.data.defaultDatasetId;
  let status: ApifyRunStatus = startJson.data.status;

  // 2. Poll status until terminal. On any abort/timeout/error, abort the run
  //    on Apify's side too — that's the whole point of switching off run-sync.
  const deadline = Date.now() + clientBudgetMs;
  try {
    while (!isTerminal(status)) {
      if (signal?.aborted) {
        await abortApifyRun(runId, token).catch(() => {});
        throw new Error(`[${label}] Apify run ${runId} cancelled by caller`);
      }
      if (Date.now() > deadline) {
        await abortApifyRun(runId, token).catch(() => {});
        throw new Error(`[${label}] Apify run ${runId} exceeded client budget`);
      }

      await sleep(pollIntervalMs, signal);

      const statusUrl = `${APIFY_BASE}/actor-runs/${encodeURIComponent(runId)}?token=${token}`;
      const statusRes = await fetch(statusUrl, { signal });
      if (!statusRes.ok) {
        throw new Error(`[${label}] Apify status check failed: HTTP ${statusRes.status}`);
      }
      const statusJson = (await statusRes.json()) as { data: ApifyRunInfo };
      status = statusJson.data.status;
    }
  } catch (e) {
    // Best-effort abort on any thrown error during polling. The inner
    // throw above already aborts; this catches errors from the status
    // fetch itself.
    abortApifyRun(runId, token).catch(() => {});
    throw e;
  }

  // 3. If the run didn't succeed, return empty with the status so the
  //    caller can log/decide. Don't throw — a single failed keyword
  //    shouldn't kill the rest of the batch.
  if (status !== "SUCCEEDED") {
    return { items: [], runId, status };
  }

  // 4. Fetch the dataset items.
  const itemsUrl = new URL(`${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items`);
  itemsUrl.searchParams.set("token", token);
  itemsUrl.searchParams.set("clean", "true");
  itemsUrl.searchParams.set("format", "json");

  const itemsRes = await fetch(itemsUrl.toString(), { signal });
  if (!itemsRes.ok) {
    throw new Error(`[${label}] Apify dataset fetch failed: HTTP ${itemsRes.status}`);
  }
  const items = (await itemsRes.json()) as T[];
  return { items, runId, status };
}

function isTerminal(s: ApifyRunStatus): boolean {
  return s === "SUCCEEDED" || s === "FAILED" || s === "ABORTED" || s === "TIMED-OUT";
}

async function abortApifyRun(runId: string, token: string): Promise<void> {
  // Fire-and-forget. We don't await the body; we just need Apify to receive
  // the abort signal. Caller wraps this in .catch(() => {}) so a 404 (race
  // where the run already finished) doesn't propagate.
  const url = `${APIFY_BASE}/actor-runs/${encodeURIComponent(runId)}/abort?token=${token}`;
  await fetch(url, { method: "POST" });
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}