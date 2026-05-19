import { not, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Hides rows seeded by `npm run db:seed` from list endpoints, without
 * deleting them. The seeder uses deterministic IDs like `product_1`,
 * `signal_47`, `opportunity_12` — a single regex per entity catches them
 * all. Real data uses different ID shapes:
 *
 *   - `product_launch_<oppid>_<ts>` for launched products
 *   - `product_from_signal_<id>` for promoted-from-feed products
 *   - `signal_<sourcePlatform>_<external-id>_<ts>` for crawler signals
 *   - `opportunity_user_<ts>_<rand>` for AI-synthesized opportunities
 *
 * Why this approach and not the alternatives:
 *
 * 1. Deleting the rows is destructive — re-seeding restores them, and
 *    we lose the comparison baseline.
 * 2. Adding an `is_seed` boolean column means a migration on every
 *    table, plus backfilling existing rows, plus updating the seeder.
 *    Bigger blast radius for what's really a temporary cleanup.
 * 3. Pattern matching at the API layer is one helper, opt-out via
 *    `?includeSeeds=1`, and the moment we don't want this behavior we
 *    delete one file.
 *
 * If the seeder ever changes its ID format, update the regex below in
 * one place. The fact that it lives next to the seeder's documented
 * conventions keeps drift visible during code review.
 */

const SEED_ID_PATTERN = /^(product|signal|opportunity|creator|trend)_\d+$/;

/**
 * Build a Drizzle WHERE clause that excludes seed rows by id pattern.
 *
 * Usage:
 *   const whereClauses = [
 *     eq(products.niche, niche),
 *     ...excludeSeedsClause(products.id, includeSeeds),
 *   ];
 *
 * Returns an array (empty when seeds are included) so it spreads
 * cleanly into existing condition lists without conditional logic at
 * each call site.
 */
export function excludeSeedsClause(idColumn: AnyPgColumn, includeSeeds: boolean) {
  if (includeSeeds) return [];
  // Postgres `~` is regex match. Using sql.raw with bound parameter to
  // keep the pattern safe — though the pattern itself is a literal here,
  // sticking with parameter binding keeps this helper safe if someone
  // ever extends it to accept a dynamic pattern.
  return [not(sql`${idColumn} ~ ${SEED_ID_PATTERN.source}`)];
}

/**
 * Read `?includeSeeds=1` (or `true`) from a request URL. Default false
 * so list endpoints hide seeds unless the caller explicitly asks.
 *
 * Why this lives here: the parsing logic is one line, but having the
 * helper means every route shares the same parameter name (no drift
 * between `?showSeeds`, `?withMocks`, `?seeds=1` etc.).
 */
export function shouldIncludeSeeds(url: URL): boolean {
  const v = url.searchParams.get("includeSeeds");
  return v === "1" || v === "true";
}

/**
 * Test-friendly synchronous check for whether a single ID looks like a
 * seed row. Useful in unit tests and one-off scripts.
 */
export function isSeedId(id: string): boolean {
  return SEED_ID_PATTERN.test(id);
}
