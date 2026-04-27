/* eslint-disable no-console */
import { hash } from "bcryptjs";
import { getDb } from "./client";
import {
  users,
  niches,
  products,
  creators,
  signals,
  trends,
  opportunities,
  goldenRules,
  feedbackPatterns,
  competitors,
  digests,
  resellableAssets,
  sources,
  conversations,
  messages,
  activityLog,
} from "./schema";
import {
  mockUsers,
  mockNiches,
  mockProducts,
  mockCreators,
  mockSignals,
  mockTrends,
  mockOpportunities,
  mockGoldenRules,
  mockFeedbackPatterns,
  mockCompetitors,
  mockDigests,
  mockResellable,
  mockSources,
  mockConversations,
  mockMessages,
  mockActivity,
} from "@/mock/data";

async function main() {
  console.log("→ Seeding NicheIQ database with mock fixtures...");
  const db = getDb();

  // Users with hashed passwords
  const userRows = await Promise.all(
    mockUsers.map(async (u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      passwordHash: await hash(u.passwordHashRef, 10),
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.createdAt),
    })),
  );
  await db.insert(users).values(userRows).onConflictDoNothing();
  console.log(`✓ users (${userRows.length})`);

  await db
    .insert(niches)
    .values(
      mockNiches.map((n) => ({
        id: n.id,
        slug: n.slug,
        label: n.label,
        description: n.description,
        parentId: n.parentId,
        iconKey: n.iconKey,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ niches (${mockNiches.length})`);

  await db
    .insert(creators)
    .values(
      mockCreators.map((c) => ({
        id: c.id,
        sourcePlatform: c.sourcePlatform,
        handle: c.handle,
        displayName: c.displayName,
        profileUrl: c.profileUrl,
        avatarUrl: c.avatarUrl ?? null,
        followerCount: c.followerCount,
        productCount: c.productCount,
        totalEstRevenueUsd: c.totalEstRevenueUsd,
        niches: c.niches,
        notes: c.notes,
        playbook: c.playbook,
        lastEnrichedAt: new Date(c.lastEnrichedAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ creators (${mockCreators.length})`);

  await db
    .insert(products)
    .values(
      mockProducts.map((p) => ({
        id: p.id,
        sourcePlatform: p.sourcePlatform,
        sourceUrl: p.sourceUrl,
        title: p.title,
        creator: p.creator,
        creatorId: p.creatorId,
        priceUsd: p.priceUsd,
        currency: p.currency,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        estMonthlySalesLow: p.estMonthlySalesLow,
        estMonthlySalesHigh: p.estMonthlySalesHigh,
        estMonthlyRevenueLow: p.estMonthlyRevenueLow,
        estMonthlyRevenueHigh: p.estMonthlyRevenueHigh,
        niche: p.niche,
        tags: p.tags,
        thumbnailUrl: p.thumbnailUrl,
        firstSeenAt: new Date(p.firstSeenAt),
        lastSeenAt: new Date(p.lastSeenAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ products (${mockProducts.length})`);

  await db
    .insert(signals)
    .values(
      mockSignals.map((s) => ({
        id: s.id,
        signalType: s.signalType,
        sourcePlatform: s.sourcePlatform,
        sourceUrl: s.sourceUrl,
        sourceId: s.sourceId,
        niche: s.niche,
        title: s.title,
        snippet: s.snippet,
        engagement: s.engagement,
        score: s.score,
        processedAt: new Date(s.processedAt),
        ideaIdsLinked: s.ideaIdsLinked,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ signals (${mockSignals.length})`);

  await db
    .insert(trends)
    .values(
      mockTrends.map((t) => ({
        id: t.id,
        keyword: t.keyword,
        niche: t.niche,
        momentumScore: t.momentumScore,
        volume7d: t.volume7d,
        volume30d: t.volume30d,
        growthPct: t.growthPct,
        geo: t.geo,
        series: t.series,
        snapshotDate: new Date(t.snapshotDate),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ trends (${mockTrends.length})`);

  await db
    .insert(opportunities)
    .values(
      mockOpportunities.map((o) => ({
        id: o.id,
        title: o.title,
        summary: o.summary,
        niche: o.niche,
        opportunityType: o.opportunityType as never,
        buildEffort: o.buildEffort as never,
        projectedRevenueUsd: o.projectedRevenueUsd,
        status: o.status as never,
        sourceProductIds: o.sourceProductIds,
        sourceSignalIds: o.sourceSignalIds,
        aiRationale: o.aiRationale,
        aiBuildPlan: o.aiBuildPlan,
        score: o.score,
        scoreBreakdown: o.scoreBreakdown,
        createdBy: o.createdBy,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ opportunities (${mockOpportunities.length})`);

  await db
    .insert(goldenRules)
    .values(
      mockGoldenRules.map((r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
        ruleType: r.ruleType,
        niche: r.niche ?? undefined,
        keywords: r.keywords,
        weight: r.weight,
        active: r.active,
        createdBy: r.createdBy,
        createdAt: new Date(r.createdAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ golden rules (${mockGoldenRules.length})`);

  await db
    .insert(feedbackPatterns)
    .values(
      mockFeedbackPatterns.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        derivedFrom: p.derivedFrom,
        confidence: p.confidence,
        signalKeywords: p.signalKeywords,
        niche: p.niche ?? undefined,
        weight: p.weight,
        lastConfirmedAt: new Date(p.lastConfirmedAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ feedback patterns (${mockFeedbackPatterns.length})`);

  await db
    .insert(sources)
    .values(
      mockSources.map((s) => ({
        id: s.id,
        sourcePlatform: s.sourcePlatform,
        label: s.label,
        config: s.config,
        enabled: s.enabled,
        cronSchedule: s.cronSchedule,
        lastRunAt: s.lastRunAt ? new Date(s.lastRunAt) : null,
        lastRunStatus: s.lastRunStatus,
        lastError: s.lastError,
        itemsTracked: s.itemsTracked,
        requiresHeadless: s.requiresHeadless ?? false,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ sources (${mockSources.length})`);

  await db
    .insert(competitors)
    .values(
      mockCompetitors.map((c) => ({
        id: c.id,
        creatorId: c.creatorId,
        depth: c.depth,
        playbook: c.playbook,
        notes: c.notes,
        lastReviewedAt: new Date(c.lastReviewedAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ competitors (${mockCompetitors.length})`);

  await db
    .insert(digests)
    .values(
      mockDigests.map((d) => ({
        id: d.id,
        cadence: d.cadence,
        periodStart: new Date(d.periodStart),
        periodEnd: new Date(d.periodEnd),
        topOpportunityIds: d.topOpportunityIds,
        risingNiches: d.risingNiches,
        topProducts: d.topProducts,
        aiSummary: d.aiSummary,
        sentTo: d.sentTo,
        createdAt: new Date(d.createdAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ digests (${mockDigests.length})`);

  await db
    .insert(resellableAssets)
    .values(
      mockResellable.map((r) => ({
        id: r.id,
        sourcePlatform: r.sourcePlatform,
        sourceUrl: r.sourceUrl,
        assetType: r.assetType,
        title: r.title,
        askingPriceUsd: r.askingPriceUsd ?? null,
        monthlyRevenueUsd: r.monthlyRevenueUsd ?? null,
        license: r.license ?? null,
        niche: r.niche ?? undefined,
        notes: r.notes,
        status: r.status,
        createdAt: new Date(r.createdAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ resellable assets (${mockResellable.length})`);

  await db
    .insert(conversations)
    .values(
      mockConversations.map((c) => ({
        id: c.id,
        userId: c.userId,
        brainMode: c.brainMode as never,
        contextRefs: c.contextRefs,
        title: c.title,
        lastMessageAt: new Date(c.lastMessageAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ conversations (${mockConversations.length})`);

  await db
    .insert(messages)
    .values(
      mockMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls ?? null,
        createdAt: new Date(m.createdAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ messages (${mockMessages.length})`);

  await db
    .insert(activityLog)
    .values(
      mockActivity.map((a) => ({
        id: a.id,
        userId: a.userId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        payload: a.payload,
        createdAt: new Date(a.createdAt),
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ activity log (${mockActivity.length})`);

  console.log("\n✓ Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
