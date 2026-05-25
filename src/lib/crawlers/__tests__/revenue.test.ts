import { describe, it, expect } from "vitest";
import {
  estimateFromSales,
  estimateFromProxy,
  monthsListed,
  PROXY_CONVERSION,
  revenueBasisTag,
  readRevenueBasis,
} from "../revenue";

const NOW = new Date("2026-05-25T00:00:00Z").getTime();

describe("monthsListed", () => {
  it("clamps brand-new listings to at least one month", () => {
    const justPublished = new Date(NOW - 1000).toISOString();
    expect(monthsListed(justPublished, NOW)).toBe(1);
  });

  it("computes whole months for older listings", () => {
    const sixMonthsAgo = new Date(NOW - 6 * 30.44 * 24 * 60 * 60 * 1000).toISOString();
    expect(monthsListed(sixMonthsAgo, NOW)).toBeCloseTo(6, 1);
  });

  it("falls back to one month on an unparseable date", () => {
    expect(monthsListed("not-a-date", NOW)).toBe(1);
  });
});

describe("estimateFromSales (Envato)", () => {
  it("turns lifetime sales into a sane monthly band", () => {
    // 1200 lifetime sales over ~12 months at $20 → ~100/mo, ~$2000/mo.
    const twelveMonthsAgo = new Date(NOW - 12 * 30.44 * 24 * 60 * 60 * 1000).toISOString();
    const est = estimateFromSales({
      totalSales: 1200,
      publishedAtIso: twelveMonthsAgo,
      priceUsd: 20,
      now: NOW,
    });
    expect(est.basis).toBe("sales-derived");
    expect(est.sales.high).toBe(100);
    expect(est.sales.low).toBe(60);
    expect(est.revenue.high).toBe(2000);
    expect(est.revenue.low).toBe(1200);
  });

  it("does not inflate a brand-new item's monthly rate", () => {
    // 50 sales on day one must read as ~50/mo (clamped), not thousands.
    const today = new Date(NOW - 1000).toISOString();
    const est = estimateFromSales({
      totalSales: 50,
      publishedAtIso: today,
      priceUsd: 10,
      now: NOW,
    });
    expect(est.sales.high).toBe(50);
  });
});

describe("estimateFromProxy (Etsy / Gumroad)", () => {
  it("leaves the low end at 0 to flag uncertainty", () => {
    const est = estimateFromProxy({
      proxyCount: 500,
      priceUsd: 12,
      basis: "favorites-proxy",
      conversion: PROXY_CONVERSION.favorites,
    });
    expect(est.sales.low).toBe(0);
    expect(est.revenue.low).toBe(0);
    expect(est.basis).toBe("favorites-proxy");
  });

  it("ratings convert more aggressively than favourites", () => {
    const ratings = estimateFromProxy({
      proxyCount: 100,
      priceUsd: 10,
      basis: "ratings-proxy",
      conversion: PROXY_CONVERSION.ratings,
    });
    const favorites = estimateFromProxy({
      proxyCount: 100,
      priceUsd: 10,
      basis: "favorites-proxy",
      conversion: PROXY_CONVERSION.favorites,
    });
    expect(ratings.sales.high).toBeGreaterThan(favorites.sales.high);
  });
});

describe("revenue basis tagging round-trip", () => {
  it("stamps and reads back the basis", () => {
    expect(revenueBasisTag("ratings-proxy")).toBe("rev:ratings-proxy");
    expect(readRevenueBasis(["notion", "rev:sales-derived", "templates"])).toBe("sales-derived");
  });

  it("returns 'unknown' when no rev tag is present", () => {
    expect(readRevenueBasis(["notion", "templates"])).toBe("unknown");
    expect(readRevenueBasis(null)).toBe("unknown");
  });
});