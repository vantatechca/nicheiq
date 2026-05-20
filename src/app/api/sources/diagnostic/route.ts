import { NextRequest } from "next/server";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { CRAWLERS } from "@/lib/crawlers/registry";

/**
 * GET /api/sources/diagnostic
 *
 * Runs each registered crawler ONCE (crawl → parse → normalize) and reports
 * what actually happens: how many signals it returns, how long it took, and
 * whether it failed — and if so, whether the failure is a missing API key
 * (config gap you can fix) versus a real error (broken endpoint, network, ToS
 * block). This tells you definitively what's feeding your database right now.
 *
 * NOTE: this makes real outbound network calls and runs against whatever env
 * keys are set in THIS environment. Hit it on the deployed app to see the
 * production picture; hit it locally to see your local picture.
 */

// Env keys each crawler needs. Used to turn a generic failure into an
// actionable "missing key" diagnosis. hacker_news and gumroad need none.
const REQUIRED_KEYS: Record<string, string[]> = {
  reddit: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"], // optional — has public fallback
  hacker_news: [],
  product_hunt: ["PRODUCT_HUNT_TOKEN"],
  kaggle: ["KAGGLE_USERNAME", "KAGGLE_KEY"],
  envato: ["ENVATO_API_KEY"],
  etsy: ["ETSY_API_KEY"],
  gumroad: [],
};

// Crawlers that work without keys (reddit degrades to public JSON).
const NO_KEY_REQUIRED = new Set(["hacker_news", "reddit", "gumroad"]);

type CrawlerResult = {
  platform: string;
  status: "ok" | "empty" | "missing_key" | "error";
  signalCount: number;
  durationMs: number;
  missingKeys: string[];
  note: string;
};

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const platforms = Object.keys(CRAWLERS);
  const results: CrawlerResult[] = [];

  for (const platform of platforms) {
    const crawler = CRAWLERS[platform];
    const required = REQUIRED_KEYS[platform] ?? [];
    const missingKeys = required.filter((k) => !process.env[k]);
    const started = Date.now();

    // Short-circuit: a key-gated crawler with no key and no fallback can't run.
    if (missingKeys.length > 0 && !NO_KEY_REQUIRED.has(platform)) {
      results.push({
        platform,
        status: "missing_key",
        signalCount: 0,
        durationMs: 0,
        missingKeys,
        note: `Not running — set ${missingKeys.join(", ")} to enable.`,
      });
      continue;
    }

    if (!crawler) {
      results.push({
        platform,
        status: "error",
        signalCount: 0,
        durationMs: 0,
        missingKeys: [],
        note: "No crawler module registered.",
      });
      continue;
    }

    try {
      const raw = await crawler.crawl({ config: { limit: 10 } });
      const parsed = crawler.parse(raw);
      const signals = crawler.normalize(parsed);
      const durationMs = Date.now() - started;

      if (signals.length === 0) {
        results.push({
          platform,
          status: "empty",
          signalCount: 0,
          durationMs,
          missingKeys,
          note:
            missingKeys.length > 0
              ? `Ran via fallback (no ${missingKeys.join(", ")}) but returned nothing.`
              : "Ran successfully but returned no items.",
        });
      } else {
        results.push({
          platform,
          status: "ok",
          signalCount: signals.length,
          durationMs,
          missingKeys,
          note:
            missingKeys.length > 0
              ? `Working via public fallback (no ${missingKeys.join(", ")} set).`
              : "Working.",
        });
      }
    } catch (err) {
      results.push({
        platform,
        status: "error",
        signalCount: 0,
        durationMs: Date.now() - started,
        missingKeys,
        note: (err as Error).message?.slice(0, 200) ?? "Unknown error.",
      });
    }
  }

  const summary = {
    total: results.length,
    working: results.filter((r) => r.status === "ok").length,
    missingKey: results.filter((r) => r.status === "missing_key").length,
    erroring: results.filter((r) => r.status === "error").length,
    empty: results.filter((r) => r.status === "empty").length,
  };

  return ok({ summary, crawlers: results, checkedAt: new Date().toISOString() });
}