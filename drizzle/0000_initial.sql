CREATE TYPE "public"."brain_mode" AS ENUM('global', 'niche', 'opportunity', 'creator', 'build_plan', 'replicate', 'dataset_review');--> statement-breakpoint
CREATE TYPE "public"."build_effort" AS ENUM('weekend', 'week', 'month', 'quarter', 'year_plus');--> statement-breakpoint
CREATE TYPE "public"."competitor_depth" AS ENUM('light', 'deep');--> statement-breakpoint
CREATE TYPE "public"."crawl_status" AS ENUM('queued', 'running', 'ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."digest_cadence" AS ENUM('daily', 'weekly', 'monthly', 'on_demand');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."niche" AS ENUM('print_on_demand', 'etsy_printable', 'notion_template', 'gumroad_ebook', 'kdp_low_content', 'course', 'ai_prompt_pack', 'figma_kit', 'wordpress_theme', 'shopify_app', 'lightroom_preset', 'sample_pack', 'video_template', 'dataset', 'plr_pack', 'micro_saas', 'browser_extension', 'discord_bot', 'game_asset', 'other');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('trend_play', 'replication', 'repackage_resell', 'niche_expansion', 'micro_saas', 'plr_remix', 'dataset_wrap');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('tracking', 'shortlisted', 'building', 'launched', 'abandoned', 'archived');--> statement-breakpoint
CREATE TYPE "public"."resellable_asset_type" AS ENUM('dataset', 'plr_pack', 'expired_etsy', 'expired_domain', 'flippa_listing', 'microacquire_listing');--> statement-breakpoint
CREATE TYPE "public"."resellable_status" AS ENUM('new', 'reviewing', 'negotiating', 'acquired', 'passed');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('block', 'penalize', 'boost', 'require');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('marketplace_listing', 'trend_query', 'social_mention', 'launch', 'milestone', 'dataset_drop', 'plr_release', 'expired_listing');--> statement-breakpoint
CREATE TYPE "public"."source_platform" AS ENUM('etsy', 'gumroad', 'creative_market', 'envato', 'design_bundles', 'kdp', 'redbubble', 'shopify_app_store', 'notion_marketplace', 'whop', 'sellfy', 'payhip', 'stan', 'lemonsqueezy', 'patreon', 'skool', 'teachers_pay_teachers', 'google_trends', 'tiktok', 'pinterest', 'reddit', 'youtube', 'twitter', 'product_hunt', 'hacker_news', 'indie_hackers', 'exploding_topics', 'kaggle', 'aws_data_exchange', 'data_world', 'data_gov', 'rapidapi', 'plr_marketplace', 'flippa', 'micro_acquire', 'empire_flippers', 'custom');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('ok', 'error', 'running', 'idle');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"depth" "competitor_depth" DEFAULT 'light' NOT NULL,
	"playbook" jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"last_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brain_mode" "brain_mode" NOT NULL,
	"context_refs" jsonb NOT NULL,
	"title" text NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"status" "crawl_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"error" text,
	"run_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creators" (
	"id" text PRIMARY KEY NOT NULL,
	"source_platform" "source_platform" NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"profile_url" text NOT NULL,
	"avatar_url" text,
	"follower_count" integer,
	"product_count" integer DEFAULT 0 NOT NULL,
	"total_est_revenue_usd" real DEFAULT 0 NOT NULL,
	"niches" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"notes" text,
	"playbook" jsonb,
	"last_enriched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digests" (
	"id" text PRIMARY KEY NOT NULL,
	"cadence" "digest_cadence" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"top_opportunity_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"rising_niches" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"top_products" jsonb NOT NULL,
	"ai_summary" text NOT NULL,
	"sent_to" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"derived_from" text NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"signal_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"niche" "niche",
	"weight" real DEFAULT 0.5 NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "golden_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"rule_type" "rule_type" NOT NULL,
	"niche" "niche",
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "niches" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" "niche" NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"parent_id" text,
	"icon_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"niche" "niche" NOT NULL,
	"opportunity_type" "opportunity_type" NOT NULL,
	"build_effort" "build_effort" NOT NULL,
	"projected_revenue_usd" real DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'tracking' NOT NULL,
	"source_product_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"source_signal_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"ai_rationale" text NOT NULL,
	"ai_build_plan" jsonb NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb NOT NULL,
	"embedding" vector(1536),
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"dimension" text NOT NULL,
	"value" real NOT NULL,
	"weight" real NOT NULL,
	"rationale" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_votes" (
	"opportunity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_votes_opportunity_id_user_id_pk" PRIMARY KEY("opportunity_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" text PRIMARY KEY NOT NULL,
	"source_platform" "source_platform" NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"creator" text,
	"creator_id" text,
	"price_usd" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"rating_avg" real,
	"rating_count" integer,
	"est_monthly_sales_low" integer,
	"est_monthly_sales_high" integer,
	"est_monthly_revenue_low" real,
	"est_monthly_revenue_high" real,
	"niche" "niche" NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"thumbnail_url" text,
	"raw_json" jsonb,
	"embedding" vector(1536),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resellable_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"source_platform" "source_platform" NOT NULL,
	"source_url" text NOT NULL,
	"asset_type" "resellable_asset_type" NOT NULL,
	"title" text NOT NULL,
	"asking_price_usd" real,
	"monthly_revenue_usd" real,
	"license" text,
	"niche" "niche",
	"notes" text DEFAULT '' NOT NULL,
	"status" "resellable_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"signal_type" "signal_type" NOT NULL,
	"source_platform" "source_platform" NOT NULL,
	"source_url" text NOT NULL,
	"source_id" text NOT NULL,
	"niche" "niche" NOT NULL,
	"title" text NOT NULL,
	"snippet" text NOT NULL,
	"engagement" jsonb NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idea_ids_linked" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_platform" "source_platform" NOT NULL,
	"label" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"cron_schedule" text DEFAULT '0 */6 * * *' NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" "source_status" DEFAULT 'idle' NOT NULL,
	"last_error" text,
	"items_tracked" integer DEFAULT 0 NOT NULL,
	"requires_headless" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trends" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"niche" "niche" NOT NULL,
	"momentum_score" real DEFAULT 0 NOT NULL,
	"volume_7d" integer DEFAULT 0 NOT NULL,
	"volume_30d" integer DEFAULT 0 NOT NULL,
	"growth_pct" real DEFAULT 0 NOT NULL,
	"geo" text DEFAULT 'US' NOT NULL,
	"series" jsonb NOT NULL,
	"snapshot_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "annotations" ADD CONSTRAINT "annotations_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitors" ADD CONSTRAINT "competitors_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunity_scores" ADD CONSTRAINT "opportunity_scores_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunity_votes" ADD CONSTRAINT "opportunity_votes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunity_votes" ADD CONSTRAINT "opportunity_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_user_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "annotations_opportunity_idx" ON "annotations" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_jobs_source_idx" ON "crawl_jobs" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "creators_handle_idx" ON "creators" USING btree ("source_platform","handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "niches_slug_idx" ON "niches" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_niche_idx" ON "opportunities" USING btree ("niche");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_score_idx" ON "opportunities" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_status_idx" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunity_scores_opportunity_idx" ON "opportunity_scores" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_source_url_idx" ON "products" USING btree ("source_platform","source_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_niche_idx" ON "products" USING btree ("niche");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_creator_idx" ON "products" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resellable_source_idx" ON "resellable_assets" USING btree ("source_platform","source_url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "signals_source_idx" ON "signals" USING btree ("source_platform","source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_niche_idx" ON "signals" USING btree ("niche");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_processed_at_idx" ON "signals" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trends_keyword_idx" ON "trends" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trends_niche_idx" ON "trends" USING btree ("niche");