import { z } from "zod";

export const idSchema = z.string().min(1);

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).optional(),
  niche: z.string().optional(),
  status: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  sourcePlatform: z.string().optional(),
  type: z.string().optional(),
  buildEffort: z.string().optional(),
  sort: z.enum(["score", "newest", "revenue"]).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const opportunityCreateSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(10),
  niche: z.string(),
  opportunityType: z.string(),
  buildEffort: z.string(),
  projectedRevenueUsd: z.number().nonnegative().optional(),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial().extend({
  status: z.string().optional(),
});

export const annotationSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const voteSchema = z.object({
  direction: z.enum(["up", "down"]),
});

export const ruleSchema = z.object({
  label: z.string().min(2),
  description: z.string().optional(),
  ruleType: z.enum(["block", "penalize", "boost", "require"]),
  niche: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  weight: z.number().min(0).max(1),
  active: z.boolean().default(true),
});

export const sourceUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  cronSchedule: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const brainMessageSchema = z.object({
  conversationId: z.string().optional(),
  mode: z.enum([
    "global",
    "niche",
    "opportunity",
    "creator",
    "build_plan",
    "replicate",
    "dataset_review",
  ]),
  contextRefs: z
    .object({
      opportunityIds: z.array(z.string()).optional(),
      productIds: z.array(z.string()).optional(),
      creatorIds: z.array(z.string()).optional(),
      niches: z.array(z.string()).optional(),
      assetIds: z.array(z.string()).optional(),
    })
    .optional(),
  message: z.string().min(1),
});

export type BrainMessageInput = z.infer<typeof brainMessageSchema>;

export const resellableSchema = z.object({
  sourcePlatform: z.string(),
  sourceUrl: z.string().url(),
  assetType: z.enum([
    "dataset",
    "plr_pack",
    "expired_etsy",
    "expired_domain",
    "flippa_listing",
    "microacquire_listing",
  ]),
  title: z.string().min(2),
  askingPriceUsd: z.number().nonnegative().optional(),
  monthlyRevenueUsd: z.number().nonnegative().optional(),
  license: z.string().optional(),
  niche: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["new", "reviewing", "negotiating", "acquired", "passed"]).default("new"),
});
