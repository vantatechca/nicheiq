// Monthly sales / revenue estimation for marketplace products.
//
// Two strategies, both deliberately CONSERVATIVE and clearly LABELLED so the
// downstream products export can show how each number was derived — important
// because these figures drive real store-building decisions.
//
//   • sales-derived  — we have a true lifetime sales count + a publish date,
//                      so a monthly average is straightforward (Envato).
//   • *-proxy        — no sales figure, only a weak demand signal (Etsy
//                      favourites, Gumroad rating count). We imply a sales band
//                      with a cautious conversion factor and a low end of 0 to
//                      signal "estimate, not measurement".
//
// All conversion assumptions live here so they can be tuned in one place as
// real data accrues.

export type RevenueBasis =
  | "sales-derived"
  | "sales-amortized"
  | "favorites-proxy"
  | "ratings-proxy";

export interface MonthlyEstimate {
  sales: { low: number; high: number };
  revenue: { low: number; high: number };
  basis: RevenueBasis;
}

const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/**
 * Months a listing has been live, clamped to >= 1 so a brand-new item with a
 * handful of sales doesn't get an absurd monthly rate (e.g. 50 sales in its
 * first day reading as "1500/mo").
 */
export function monthsListed(publishedAtIso: string, now: number = Date.now()): number {
  const published = new Date(publishedAtIso).getTime();
  if (!Number.isFinite(published)) return 1;
  return Math.max(1, (now - published) / MS_PER_MONTH);
}

/**
 * Strategy A — lifetime sales ÷ months listed × price. Used for sources that
 * expose a real total sales count (Envato). We can't see seasonality, so we
 * return a band around the average rather than a single point: the central
 * estimate is the `high`, a conservative 60% of it is the `low`.
 */
export function estimateFromSales(input: {
  totalSales: number;
  publishedAtIso: string;
  priceUsd: number;
  now?: number;
}): MonthlyEstimate {
  const months = monthsListed(input.publishedAtIso, input.now);
  const perMonth = Math.max(0, input.totalSales) / months;
  const high = Math.round(perMonth);
  const low = Math.round(perMonth * 0.6);
  const price = Math.max(0, input.priceUsd);
  return {
    sales: { low, high },
    revenue: { low: low * price, high: high * price },
    basis: "sales-derived",
  };
}

/**
 * Strategy A′ — REAL lifetime sales but NO publish date. Gumroad's "X sales"
 * badge exposes a lifetime total but not a start date, so we can't compute a
 * true monthly rate the way estimateFromSales does. Instead we amortize the
 * lifetime total over an assumed window (default 12 months). Tagged
 * "sales-amortized" so it's honestly distinguished from date-anchored
 * "sales-derived" — but it's still backed by a real sales count, so the
 * products workbook treats it as real (not a proxy guess). Same 60% low band
 * as estimateFromSales.
 */
export function estimateFromSalesAmortized(input: {
  totalSales: number;
  priceUsd: number;
  windowMonths?: number;
}): MonthlyEstimate {
  const months = Math.max(1, input.windowMonths ?? 12);
  const perMonth = Math.max(0, input.totalSales) / months;
  const high = Math.round(perMonth);
  const low = Math.round(perMonth * 0.6);
  const price = Math.max(0, input.priceUsd);
  return {
    sales: { low, high },
    revenue: { low: low * price, high: high * price },
    basis: "sales-amortized",
  };
}

// Conversion factors for the proxy strategy. Both intentionally cautious.
export const PROXY_CONVERSION = {
  // Etsy favourites accumulate over a listing's whole life and most never
  // convert. Treat a small slice as implied monthly sales.
  favorites: 0.02,
  // Gumroad rating_count is a LOWER BOUND on lifetime sales (only buyers can
  // rate). Assume ratings ≈ 30% of buyers, spread over a ~12-month window:
  // lifetime sales ≈ count / 0.3, monthly ≈ that / 12.
  ratings: 1 / 0.3 / 12,
} as const;

/**
 * Strategy B — weak proxy. `proxyCount` is favourites (Etsy) or rating count
 * (Gumroad). We imply a monthly sales HIGH from the proxy and leave LOW at 0 to
 * make the uncertainty explicit. Always tagged with a non-"sales-derived"
 * basis so the export can flag it.
 */
export function estimateFromProxy(input: {
  proxyCount: number;
  priceUsd: number;
  basis: Exclude<RevenueBasis, "sales-derived">;
  conversion: number;
}): MonthlyEstimate {
  const high = Math.round(Math.max(0, input.proxyCount) * input.conversion);
  const price = Math.max(0, input.priceUsd);
  return {
    sales: { low: 0, high },
    revenue: { low: 0, high: high * price },
    basis: input.basis,
  };
}

/** The tag we stamp on a product so the export can surface a revenueBasis column. */
export function revenueBasisTag(basis: RevenueBasis): string {
  return `rev:${basis}`;
}

/** Pull the basis back out of a tag list (used by the export route). */
export function readRevenueBasis(tags: string[] | null | undefined): string {
  const tag = (tags ?? []).find((t) => t.startsWith("rev:"));
  return tag ? tag.slice("rev:".length) : "unknown";
}