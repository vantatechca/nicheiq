// Loads .env.local into process.env for tests.
//
// We parse the file directly rather than using @next/env's loadEnvConfig,
// because that helper (matching Next.js behavior) deliberately SKIPS .env.local
// when NODE_ENV === "test" — and Vitest sets NODE_ENV=test. That quirk meant
// keys living only in .env.local (e.g. OPENROUTER_API_KEY) never loaded.
//
// Inline env vars (e.g. RUN_LIVE_CRAWL set on the command line) take precedence:
// we only fill in keys that aren't already set.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = val;
  }
}