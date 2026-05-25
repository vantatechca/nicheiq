import { describe, it, expect } from "vitest";
import { isProductPlatform } from "../_persist-signals";

describe("isProductPlatform", () => {
  it("routes real marketplace listings to the products table", () => {
    expect(isProductPlatform("etsy")).toBe(true);
    expect(isProductPlatform("gumroad")).toBe(true);
    expect(isProductPlatform("envato")).toBe(true);
    expect(isProductPlatform("creative_market")).toBe(true);
    expect(isProductPlatform("kdp")).toBe(true);
  });

  it("keeps discussion / trend sources as signals", () => {
    expect(isProductPlatform("reddit")).toBe(false);
    expect(isProductPlatform("hacker_news")).toBe(false);
    expect(isProductPlatform("product_hunt")).toBe(false);
    expect(isProductPlatform("google_trends")).toBe(false);
  });

  it("treats unknown platforms as signals (safe default)", () => {
    expect(isProductPlatform("totally_made_up")).toBe(false);
    expect(isProductPlatform("")).toBe(false);
  });
});