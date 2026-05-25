-- Adds "first_seen_at" to signals so re-crawls no longer lose the date a
-- signal was FIRST observed.
--
-- Before this, the upsert in _persist-signals.ts overwrote "processed_at" on
-- every re-crawl, so there was only one timestamp and it always reflected the
-- latest crawl — i.e. it behaved like "last seen" and "first seen" was lost.
--
-- After this:
--   - first_seen_at  → set once on insert, NEVER touched on conflict (preserved)
--   - processed_at   → still bumped to now() on every re-crawl ("last seen")
--
-- Backfill: existing rows get first_seen_at = their current processed_at, which
-- is the best estimate of when we first saw them (it's all we have).

ALTER TABLE "signals" ADD COLUMN "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "signals" SET "first_seen_at" = "processed_at";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_first_seen_at_idx" ON "signals" USING btree ("first_seen_at");