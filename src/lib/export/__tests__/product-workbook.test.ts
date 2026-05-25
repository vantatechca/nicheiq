import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { aggregateByNiche, buildProductWorkbook, type ProductRow } from "../product-workbook";

function mockRow(over: Partial<ProductRow> = {}): ProductRow {
  return {
    title: "Test Product",
    niche: "wordpress_theme",
    platform: "envato",
    sales: 100,
    revenue: 3000,
    basis: "sales-derived",
    firstSeenAt: new Date("2026-05-01T00:00:00Z"),
    lastSeenAt: new Date("2026-05-20T00:00:00Z"),
    ...over,
  };
}

describe("aggregateByNiche (products)", () => {
  it("counts, averages revenue, totals, and sorts by product count desc", () => {
    const rows = [
      mockRow({ niche: "wordpress_theme", revenue: 1000 }),
      mockRow({ niche: "wordpress_theme", revenue: 3000 }),
      mockRow({ niche: "font_bundle", revenue: 500 }),
    ];
    const agg = aggregateByNiche(rows);
    expect(agg[0]).toEqual({
      niche: "wordpress_theme",
      count: 2,
      avgRevenue: 2000,
      totalRevenue: 4000,
    });
    expect(agg[1]!.niche).toBe("font_bundle");
    expect(agg[1]!.count).toBe(1);
  });

  it("treats null revenue as 0", () => {
    const agg = aggregateByNiche([mockRow({ revenue: null })]);
    expect(agg[0]!.totalRevenue).toBe(0);
  });
});

describe("buildProductWorkbook", () => {
  it("produces 3 sheets; Top Candidates floors at $2k and All Products ranks by last seen", async () => {
    // Revenues 5000 down; the $1000 one is below the $2k candidate floor.
    const rows: ProductRow[] = [
      mockRow({ title: "A", revenue: 5000, lastSeenAt: new Date("2026-05-10T00:00:00Z") }),
      mockRow({ title: "B", revenue: 3000, lastSeenAt: new Date("2026-05-25T00:00:00Z") }),
      mockRow({ title: "C", revenue: 1000, lastSeenAt: new Date("2026-05-15T00:00:00Z") }),
    ];

    const buf = await buildProductWorkbook(rows);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Top Candidates",
      "All Products",
      "By Niche",
    ]);

    // Top Candidates: only the two >= $2k, highest revenue first.
    const top = wb.getWorksheet("Top Candidates")!;
    expect(top.getCell("A5").value).toBe(1);
    expect(top.getCell("F5").value).toBe(5000); // highest revenue first
    expect(top.getCell("B7").value).toBe("Totals / Averages"); // 2 rows → row 7

    // All Products: ranked by last seen, so "B" (May 25) is first.
    const all = wb.getWorksheet("All Products")!;
    expect(all.getCell("B5").value).toBe("B");
  });
});