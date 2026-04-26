import type { NicheValue, SourcePlatform } from "@/lib/utils/constants";

export type ApiResponse<T> = { data: T; error?: string; meta?: Record<string, unknown> };

export type ScoreDimensionKey = "demand" | "competition" | "revenue" | "buildEffort" | "trend";

export type ScoreBreakdown = {
  dimensions: Record<ScoreDimensionKey, { value: number; weight: number; rationale?: string }>;
  ruleModifiers: { ruleId: string; label: string; ruleType: string; delta: number; matched: string[] }[];
  patternModifiers: { patternId: string; label: string; delta: number }[];
  finalScore: number;
  computedAt: string;
};

export type Product = {
  id: string;
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  title: string;
  creator: string | null;
  creatorId: string | null;
  priceUsd: number | null;
  currency: string;
  ratingAvg: number | null;
  ratingCount: number | null;
  estMonthlySalesLow: number | null;
  estMonthlySalesHigh: number | null;
  estMonthlyRevenueLow: number | null;
  estMonthlyRevenueHigh: number | null;
  niche: NicheValue;
  tags: string[];
  thumbnailUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type Creator = {
  id: string;
  sourcePlatform: SourcePlatform;
  handle: string;
  displayName: string;
  profileUrl: string;
  followerCount: number | null;
  productCount: number;
  totalEstRevenueUsd: number;
  niches: string[];
  notes: string | null;
  lastEnrichedAt: string;
  avatarUrl?: string;
  playbook?: CreatorPlaybook;
};

export type CreatorPlaybook = {
  pricingTiers: { label: string; priceUsd: number }[];
  postingCadence: string;
  topTags: string[];
  funnels: string[];
  signatureStyle: string;
};

export type Signal = {
  id: string;
  signalType:
    | "marketplace_listing"
    | "trend_query"
    | "social_mention"
    | "launch"
    | "milestone"
    | "dataset_drop"
    | "plr_release"
    | "expired_listing";
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  sourceId: string;
  niche: NicheValue;
  title: string;
  snippet: string;
  engagement: { upvotes?: number; comments?: number; shares?: number; sales?: number };
  score: number;
  processedAt: string;
  ideaIdsLinked: string[];
};

export type Trend = {
  id: string;
  keyword: string;
  niche: NicheValue;
  momentumScore: number;
  volume7d: number;
  volume30d: number;
  growthPct: number;
  geo: string;
  series: { date: string; value: number }[];
  snapshotDate: string;
};

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  niche: NicheValue;
  opportunityType: string;
  buildEffort: string;
  projectedRevenueUsd: number;
  status: string;
  sourceProductIds: string[];
  sourceSignalIds: string[];
  aiRationale: string;
  aiBuildPlan: BuildPlan;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  createdBy: "user" | "ai";
  createdAt: string;
  updatedAt: string;
  votes: { up: number; down: number };
  saved: boolean;
};

export type BuildPlan = {
  weeks: { label: string; deliverables: string[] }[];
  stack: string[];
  risks: string[];
  monetization: string[];
  successMetrics: string[];
};

export type GoldenRule = {
  id: string;
  label: string;
  description: string;
  ruleType: "block" | "penalize" | "boost" | "require";
  niche: NicheValue | null;
  keywords: string[];
  weight: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
};

export type FeedbackPattern = {
  id: string;
  label: string;
  description: string;
  derivedFrom: "votes" | "saves" | "builds" | "abandons";
  confidence: number;
  signalKeywords: string[];
  niche: NicheValue | null;
  weight: number;
  lastConfirmedAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  brainMode: string;
  contextRefs: {
    opportunityIds?: string[];
    productIds?: string[];
    creatorIds?: string[];
    niches?: string[];
    assetIds?: string[];
  };
  title: string;
  lastMessageAt: string;
  messageCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: { name: string; input: unknown; output?: unknown }[];
  createdAt: string;
};

export type Source = {
  id: string;
  sourcePlatform: SourcePlatform;
  label: string;
  config: Record<string, unknown>;
  enabled: boolean;
  cronSchedule: string;
  lastRunAt: string | null;
  lastRunStatus: "ok" | "error" | "running" | "idle";
  lastError: string | null;
  itemsTracked: number;
  requiresHeadless?: boolean;
};

export type CrawlJob = {
  id: string;
  sourceId: string;
  status: "queued" | "running" | "ok" | "error";
  startedAt: string;
  finishedAt: string | null;
  itemsFound: number;
  itemsNew: number;
  error: string | null;
};

export type Competitor = {
  id: string;
  creatorId: string;
  depth: "light" | "deep";
  playbook: CreatorPlaybook;
  notes: string;
  lastReviewedAt: string;
};

export type Digest = {
  id: string;
  cadence: "daily" | "weekly" | "monthly" | "on_demand";
  periodStart: string;
  periodEnd: string;
  topOpportunityIds: string[];
  risingNiches: string[];
  topProducts: { id: string; title: string; revenue: number }[];
  aiSummary: string;
  sentTo: string[];
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ResellableAsset = {
  id: string;
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  assetType:
    | "dataset"
    | "plr_pack"
    | "expired_etsy"
    | "expired_domain"
    | "flippa_listing"
    | "microacquire_listing";
  title: string;
  askingPriceUsd: number | null;
  monthlyRevenueUsd: number | null;
  license: string | null;
  niche: NicheValue | null;
  notes: string;
  status: "new" | "reviewing" | "negotiating" | "acquired" | "passed";
  createdAt: string;
};

export type Niche = {
  id: string;
  slug: NicheValue;
  label: string;
  description: string;
  parentId: string | null;
  iconKey: string;
  productCount: number;
  opportunityCount: number;
  momentumScore: number;
};

export type DashboardKpis = {
  newOpportunities24h: number;
  trendingNiches: number;
  activeBuilds: number;
  totalProjectedRevenue: number;
  avgScore: number;
  scoreSparkline: { date: string; value: number }[];
};
