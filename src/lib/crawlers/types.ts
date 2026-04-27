import type { NicheValue, SourcePlatform } from "@/lib/utils/constants";

export interface RawSignal {
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  sourceId: string;
  title: string;
  snippet?: string;
  niche?: NicheValue;
  priceUsd?: number;
  ratingAvg?: number;
  ratingCount?: number;
  estMonthlySales?: { low: number; high: number };
  estMonthlyRevenue?: { low: number; high: number };
  thumbnailUrl?: string;
  tags?: string[];
  creator?: { handle: string; displayName?: string; profileUrl?: string };
  rawJson: Record<string, unknown>;
  capturedAt: string;
}

export interface CrawlerModule {
  source: SourcePlatform;
  requiresHeadless: boolean;
  /** Best-effort fetch — returns raw payload (HTML, JSON, etc). */
  crawl(opts: { config: Record<string, unknown> }): Promise<unknown>;
  /** Parse the raw payload into raw items. */
  parse(raw: unknown): unknown[];
  /** Normalize parsed items into a unified RawSignal shape. */
  normalize(parsed: unknown[]): RawSignal[];
}
