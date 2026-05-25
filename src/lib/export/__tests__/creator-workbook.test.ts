import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { aggregateByNiche, buildCreatorWorkbook, type CreatorRow } from "../creator-workbook";

function mockRow(over: Partial<CreatorRow> = {}): CreatorRow {
  return {
    handle: "themegoods",
    displayName: "ThemeGoods",
    platform: "envato",
    productCount: 3,
    totalRevenue: 12000,
    niches: ["wordpress_theme"],
    profileUrl: "https://themeforest.net/user/themegoods",
    ...over,
  };
}

describe("aggregateByNiche (creators)", () => {
  it("counts distinct creators active in each niche, sorted desc", () => {
    const rows = [
      mockRow({ handle: "a", niches: ["wordpress_theme", "font_bundle"] }),
      mockRow({ handle: "b", niches: ["wordpress_theme"] }),
      mockRow({ handle: "c", niches: ["font_bundle"] }),
    ];
    const agg = aggregateByNiche(rows);
    expect(agg[0]).toEqual({ niche: "wordpress_theme", creatorCount: 2 });
    expect(agg.find((n) => n.niche === "font_bundle")!.creatorCount).toBe(2);
  });

  it("does not double-count a niche listed twice for one creator", () => {
    const agg = aggregateByNiche([mockRow({ niches: ["wordpress_theme", "wordpress_theme"] })]);
    expect(agg[0]!.creatorCount).toBe(1);
  });
});

describe("buildCreatorWorkbook", () => {
  it("produces 3 sheets, ranked by revenue, with a totals row", async () => {
    const rows: CreatorRow[] = [
      mockRow({ handle: "a", displayName: "A", totalRevenue: 5000 }),
      mockRow({ handle: "b", displayName: "B", totalRevenue: 30000 }),
    ];

    const buf = await buildCreatorWorkbook(rows);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    expect(wb.worksheets.map((w) => w.name)).toEqual(["Top Creators", "All Creators", "By Niche"]);

    const top = wb.getWorksheet("Top Creators")!;
    expect(top.getCell("B5").value).toBe("B"); // highest revenue first
    expect(top.getCell("E5").value).toBe(30000);
    expect(top.getCell("B7").value).toBe("Totals"); // 2 rows → row 7
  });
});