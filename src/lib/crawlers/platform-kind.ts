/**
 * Single source of truth for how a source platform is classified:
 * a digital-product MARKETPLACE (crawled items are real products with a price,
 * rating and revenue → routed to the `products` table) versus a TREND source
 * (discussion / launch / dataset chatter → routed to the `signals` table).
 *
 * This module is deliberately dependency-free (no DB, no server imports) so it
 * can be shared by both the persistence layer (`_persist-signals.ts`) and
 * client components (the Sources dashboard) without dragging server code into
 * the client bundle. Persistence routing and UI grouping therefore agree by
 * construction.
 */
export const PRODUCT_PLATFORMS = new Set<string>([
  "etsy",
  "gumroad",
  "creative_market",
  "envato",
  "design_bundles",
  "kdp",
  "redbubble",
  "lemonsqueezy",
  "sellfy",
  "payhip",
  "teachers_pay_teachers",
]);

/** True if the platform's crawled items are products (else trend signals). */
export function isProductPlatform(platform: string): boolean {
  return PRODUCT_PLATFORMS.has(platform);
}