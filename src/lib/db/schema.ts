import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  vector,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ----------------------------- Enums -----------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "viewer"]);

export const nicheEnum = pgEnum("niche", [
  "print_on_demand",
  "etsy_printable",
  "notion_template",
  "gumroad_ebook",
  "kdp_low_content",
  "course",
  "ai_prompt_pack",
  "figma_kit",
  "wordpress_theme",
  "shopify_app",
  "lightroom_preset",
  "sample_pack",
  "video_template",
  "dataset",
  "plr_pack",
  "micro_saas",
  "browser_extension",
  "discord_bot",
  "game_asset",
  "other",
]);

export const productStatusEnum = pgEnum("product_status", [
  "tracking",
  "shortlisted",
  "building",
  "launched",
  "abandoned",
  "archived",
]);

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "trend_play",
  "replication",
  "repackage_resell",
  "niche_expansion",
  "micro_saas",
  "plr_remix",
  "dataset_wrap",
]);

export const buildEffortEnum = pgEnum("build_effort", [
  "weekend",
  "week",
  "month",
  "quarter",
  "year_plus",
]);

export const signalTypeEnum = pgEnum("signal_type", [
  "marketplace_listing",
  "trend_query",
  "social_mention",
  "launch",
  "milestone",
  "dataset_drop",
  "plr_release",
  "expired_listing",
]);

export const sourcePlatformEnum = pgEnum("source_platform", [
  "etsy",
  "gumroad",
  "creative_market",
  "envato",
  "design_bundles",
  "kdp",
  "redbubble",
  "shopify_app_store",
  "notion_marketplace",
  "whop",
  "sellfy",
  "payhip",
  "stan",
  "lemonsqueezy",
  "patreon",
  "skool",
  "teachers_pay_teachers",
  "google_trends",
  "tiktok",
  "pinterest",
  "reddit",
  "youtube",
  "twitter",
  "product_hunt",
  "hacker_news",
  "indie_hackers",
  "exploding_topics",
  "kaggle",
  "aws_data_exchange",
  "data_world",
  "data_gov",
  "rapidapi",
  "plr_marketplace",
  "flippa",
  "micro_acquire",
  "empire_flippers",
  "custom",
]);

export const digestCadenceEnum = pgEnum("digest_cadence", ["daily", "weekly", "monthly", "on_demand"]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system", "tool"]);

export const brainModeEnum = pgEnum("brain_mode", [
  "global",
  "niche",
  "opportunity",
  "creator",
  "build_plan",
  "replicate",
  "dataset_review",
]);

export const ruleTypeEnum = pgEnum("rule_type", ["block", "penalize", "boost", "require"]);

export const sourceStatusEnum = pgEnum("source_status", ["ok", "error", "running", "idle"]);

export const crawlStatusEnum = pgEnum("crawl_status", ["queued", "running", "ok", "error"]);

export const competitorDepthEnum = pgEnum("competitor_depth", ["light", "deep"]);

export const resellableAssetTypeEnum = pgEnum("resellable_asset_type", [
  "dataset",
  "plr_pack",
  "expired_etsy",
  "expired_domain",
  "flippa_listing",
  "microacquire_listing",
]);

export const resellableStatusEnum = pgEnum("resellable_status", [
  "new",
  "reviewing",
  "negotiating",
  "acquired",
  "passed",
]);

// ----------------------------- Tables -----------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const niches = pgTable(
  "niches",
  {
    id: text("id").primaryKey(),
    slug: nicheEnum("slug").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    parentId: text("parent_id"),
    iconKey: text("icon_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("niches_slug_idx").on(t.slug),
  }),
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    creator: text("creator"),
    creatorId: text("creator_id"),
    priceUsd: real("price_usd"),
    currency: text("currency").notNull().default("USD"),
    ratingAvg: real("rating_avg"),
    ratingCount: integer("rating_count"),
    estMonthlySalesLow: integer("est_monthly_sales_low"),
    estMonthlySalesHigh: integer("est_monthly_sales_high"),
    estMonthlyRevenueLow: real("est_monthly_revenue_low"),
    estMonthlyRevenueHigh: real("est_monthly_revenue_high"),
    niche: nicheEnum("niche").notNull(),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    thumbnailUrl: text("thumbnail_url"),
    rawJson: jsonb("raw_json"),
    embedding: vector("embedding", { dimensions: 1536 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceUrlIdx: uniqueIndex("products_source_url_idx").on(t.sourcePlatform, t.sourceUrl),
    nicheIdx: index("products_niche_idx").on(t.niche),
    creatorIdx: index("products_creator_idx").on(t.creatorId),
  }),
);

export const creators = pgTable(
  "creators",
  {
    id: text("id").primaryKey(),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    profileUrl: text("profile_url").notNull(),
    avatarUrl: text("avatar_url"),
    followerCount: integer("follower_count"),
    productCount: integer("product_count").notNull().default(0),
    totalEstRevenueUsd: real("total_est_revenue_usd").notNull().default(0),
    niches: text("niches").array().notNull().default(sql`ARRAY[]::text[]`),
    notes: text("notes"),
    playbook: jsonb("playbook"),
    lastEnrichedAt: timestamp("last_enriched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    handleIdx: uniqueIndex("creators_handle_idx").on(t.sourcePlatform, t.handle),
  }),
);

export const signals = pgTable(
  "signals",
  {
    id: text("id").primaryKey(),
    signalType: signalTypeEnum("signal_type").notNull(),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceId: text("source_id").notNull(),
    niche: nicheEnum("niche").notNull(),
    title: text("title").notNull(),
    snippet: text("snippet").notNull(),
    engagement: jsonb("engagement").notNull(),
    score: real("score").notNull().default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
    ideaIdsLinked: text("idea_ids_linked").array().notNull().default(sql`ARRAY[]::text[]`),
  },
  (t) => ({
    sourceIdIdx: uniqueIndex("signals_source_idx").on(t.sourcePlatform, t.sourceId),
    nicheIdx: index("signals_niche_idx").on(t.niche),
    processedAtIdx: index("signals_processed_at_idx").on(t.processedAt),
  }),
);

export const trends = pgTable(
  "trends",
  {
    id: text("id").primaryKey(),
    keyword: text("keyword").notNull(),
    niche: nicheEnum("niche").notNull(),
    momentumScore: real("momentum_score").notNull().default(0),
    volume7d: integer("volume_7d").notNull().default(0),
    volume30d: integer("volume_30d").notNull().default(0),
    growthPct: real("growth_pct").notNull().default(0),
    geo: text("geo").notNull().default("US"),
    series: jsonb("series").notNull(),
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    keywordIdx: index("trends_keyword_idx").on(t.keyword),
    nicheIdx: index("trends_niche_idx").on(t.niche),
  }),
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    niche: nicheEnum("niche").notNull(),
    opportunityType: opportunityTypeEnum("opportunity_type").notNull(),
    buildEffort: buildEffortEnum("build_effort").notNull(),
    projectedRevenueUsd: real("projected_revenue_usd").notNull().default(0),
    status: productStatusEnum("status").notNull().default("tracking"),
    sourceProductIds: text("source_product_ids").array().notNull().default(sql`ARRAY[]::text[]`),
    sourceSignalIds: text("source_signal_ids").array().notNull().default(sql`ARRAY[]::text[]`),
    aiRationale: text("ai_rationale").notNull(),
    aiBuildPlan: jsonb("ai_build_plan").notNull(),
    score: real("score").notNull().default(0),
    scoreBreakdown: jsonb("score_breakdown").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nicheIdx: index("opportunities_niche_idx").on(t.niche),
    scoreIdx: index("opportunities_score_idx").on(t.score),
    statusIdx: index("opportunities_status_idx").on(t.status),
  }),
);

export const opportunityScores = pgTable(
  "opportunity_scores",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    value: real("value").notNull(),
    weight: real("weight").notNull(),
    rationale: text("rationale"),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    opportunityIdx: index("opportunity_scores_opportunity_idx").on(t.opportunityId),
  }),
);

export const goldenRules = pgTable("golden_rules", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  niche: nicheEnum("niche"),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  weight: real("weight").notNull().default(0.5),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbackPatterns = pgTable("feedback_patterns", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  derivedFrom: text("derived_from").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  signalKeywords: text("signal_keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  niche: nicheEnum("niche"),
  weight: real("weight").notNull().default(0.5),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const annotations = pgTable(
  "annotations",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    opportunityIdx: index("annotations_opportunity_idx").on(t.opportunityId),
  }),
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brainMode: brainModeEnum("brain_mode").notNull(),
    contextRefs: jsonb("context_refs").notNull(),
    title: text("title").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("conversations_user_idx").on(t.userId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  }),
);

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
  label: text("label").notNull(),
  config: jsonb("config").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  cronSchedule: text("cron_schedule").notNull().default("0 */6 * * *"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: sourceStatusEnum("last_run_status").notNull().default("idle"),
  lastError: text("last_error"),
  itemsTracked: integer("items_tracked").notNull().default(0),
  requiresHeadless: boolean("requires_headless").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const crawlJobs = pgTable(
  "crawl_jobs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    status: crawlStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    itemsFound: integer("items_found").notNull().default(0),
    itemsNew: integer("items_new").notNull().default(0),
    error: text("error"),
    runId: text("run_id"),
  },
  (t) => ({
    sourceIdx: index("crawl_jobs_source_idx").on(t.sourceId),
  }),
);

export const competitors = pgTable("competitors", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  depth: competitorDepthEnum("depth").notNull().default("light"),
  playbook: jsonb("playbook").notNull(),
  notes: text("notes").notNull().default(""),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const digests = pgTable("digests", {
  id: text("id").primaryKey(),
  cadence: digestCadenceEnum("cadence").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  topOpportunityIds: text("top_opportunity_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  risingNiches: text("rising_niches").array().notNull().default(sql`ARRAY[]::text[]`),
  topProducts: jsonb("top_products").notNull(),
  aiSummary: text("ai_summary").notNull(),
  sentTo: text("sent_to").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("activity_log_user_idx").on(t.userId),
    createdAtIdx: index("activity_log_created_idx").on(t.createdAt),
  }),
);

export const resellableAssets = pgTable(
  "resellable_assets",
  {
    id: text("id").primaryKey(),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    sourceUrl: text("source_url").notNull(),
    assetType: resellableAssetTypeEnum("asset_type").notNull(),
    title: text("title").notNull(),
    askingPriceUsd: real("asking_price_usd"),
    monthlyRevenueUsd: real("monthly_revenue_usd"),
    license: text("license"),
    niche: nicheEnum("niche"),
    notes: text("notes").notNull().default(""),
    status: resellableStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceUrlIdx: uniqueIndex("resellable_source_idx").on(t.sourcePlatform, t.sourceUrl),
  }),
);

export const opportunityVotes = pgTable(
  "opportunity_votes",
  {
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.opportunityId, t.userId] }),
  }),
);

// ----------------------------- Type aliases -----------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Niche = typeof niches.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Creator = typeof creators.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Trend = typeof trends.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type GoldenRule = typeof goldenRules.$inferSelect;
export type FeedbackPattern = typeof feedbackPatterns.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type CrawlJob = typeof crawlJobs.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type Digest = typeof digests.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
export type ResellableAsset = typeof resellableAssets.$inferSelect;
export type OpportunityVote = typeof opportunityVotes.$inferSelect;
