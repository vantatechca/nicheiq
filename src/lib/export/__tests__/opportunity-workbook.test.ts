import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  titleCase,
  scoreColor,
  aggregateByNiche,
  buildOpportunityWorkbook,
  type OppRow,
} from "../opportunity-workbook";

function mockRow(over: Partial<OppRow> = {}): OppRow {
  return {
    title: "Test Opportunity",
    niche: "etsy_printable",
    type: "replication",
    effort: "week",
    status: "tracking",
    score: 80,
    revenue: 1000,
    createdAt: new Date("2026-05-14T00:00:00Z"),
    ...over,
  };
}

describe("titleCase", () => {
  it("converts snake_case enum values to display labels", () => {
    expect(titleCase("etsy_printable")).toBe("Etsy Printable");
    expect(titleCase("micro_saas")).toBe("Micro Saas");
    expect(titleCase("repackage_resell")).toBe("Repackage Resell");
    expect(titleCase("week")).toBe("Week");
    expect(titleCase("")).toBe("");
  });
});

describe("scoreColor", () => {
  it("greens strong scores, ambers middling, grays weak", () => {
    expect(scoreColor(98)).toBe("FF1D9E75");
    expect(scoreColor(90)).toBe("FF1D9E75");
    expect(scoreColor(80)).toBe("FFBA7517");
    expect(scoreColor(75)).toBe("FFBA7517");
    expect(scoreColor(60)).toBe("FF6B7280");
  });
});

describe("aggregateByNiche", () => {
  it("counts, averages, totals, and sorts by opportunity count desc", () => {
    const rows = [
      mockRow({ niche: "micro_saas", score: 70, revenue: 100 }),
      mockRow({ niche: "micro_saas", score: 80, revenue: 200 }),
      mockRow({ niche: "etsy_printable", score: 90, revenue: 50 }),
    ];
    const agg = aggregateByNiche(rows);
    expect(agg[0]).toEqual({
      niche: "micro_saas",
      count: 2,
      avgScore: 75,
      totalRevenue: 300,
    });
    expect(agg[1]!.niche).toBe("etsy_printable");
    expect(agg[1]!.count).toBe(1);
  });

  it("treats null revenue as 0", () => {
    const agg = aggregateByNiche([mockRow({ revenue: null })]);
    expect(agg[0]!.totalRevenue).toBe(0);
  });
});

describe("buildOpportunityWorkbook", () => {
  it("produces a 3-sheet workbook with Top Candidates capped and score-filtered", async () => {
    // 20 rows: scores 95 down to 76 — only those >= 78 belong in Top Candidates.
    const rows: OppRow[] = Array.from({ length: 20 }, (_, i) =>
      mockRow({ title: `Opp ${i}`, score: 95 - i }),
    );

    const buf = await buildOpportunityWorkbook(rows);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Top Candidates",
      "All Opportunities",
      "By Niche",
    ]);

    // Top Candidates: scores 95..78 = 18 qualify, capped at 15.
    const top = wb.getWorksheet("Top Candidates")!;
    // header at row 4, data from row 5; 15 data rows; +1 totals row.
    expect(top.getCell("A5").value).toBe(1); // first rank
    expect(top.getCell("G5").value).toBe(95); // highest score first
    expect(top.getCell("B20").value).toBe("Totals / Averages"); // 5 + 15 = row 20

    // All Opportunities: all 20 rows present (header row 4, data 5..24).
    const all = wb.getWorksheet("All Opportunities")!;
    expect(all.getCell("A24").value).toBe(20);
  });
});