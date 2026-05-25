import { describe, it, expect } from "vitest";
import { cloneDifficulty } from "../niche-difficulty";

describe("cloneDifficulty", () => {
  it("classifies pure-file niches as easy", () => {
    expect(cloneDifficulty("notion_template")).toBe("easy");
    expect(cloneDifficulty("etsy_printable")).toBe("easy");
    expect(cloneDifficulty("ai_prompt_pack")).toBe("easy");
    expect(cloneDifficulty("canva_template")).toBe("easy");
  });

  it("classifies production-but-no-moat niches as medium", () => {
    expect(cloneDifficulty("figma_kit")).toBe("medium");
    expect(cloneDifficulty("mini_course")).toBe("medium");
    expect(cloneDifficulty("sample_pack")).toBe("medium");
  });

  it("classifies code/data builds as hard", () => {
    expect(cloneDifficulty("micro_saas")).toBe("hard");
    expect(cloneDifficulty("shopify_app")).toBe("hard");
    expect(cloneDifficulty("dataset")).toBe("hard");
    expect(cloneDifficulty("browser_extension")).toBe("hard");
  });

  it("defaults unknown niches to hard (safe — never over-promises an easy clone)", () => {
    expect(cloneDifficulty("something_new")).toBe("hard");
    expect(cloneDifficulty("")).toBe("hard");
  });
});