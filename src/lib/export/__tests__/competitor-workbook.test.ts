import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildCompetitorWorkbook, type CompetitorRow } from "../competitor-workbook";

function mockRow(over: Partial<CompetitorRow> = {}): CompetitorRow {
  return {
    creator: "ThemeGoods",
    platform: "envato",
    depth: "deep",
    followers: 12000,
    revenue: 30000,
    pricingTiers: "Regular $59 · Extended $2,950",
    notes: "Strong WordPress catalog; bundles drive most revenue.",
    ...over,
  };
}

describe("buildCompetitorWorkbook", () => {
  it("produces a single styled sheet with a header and rows", async () => {
    const buf = await buildCompetitorWorkbook([
      mockRow(),
      mockRow({ creator: "WorkDo", revenue: 4000 }),
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    expect(wb.worksheets.map((w) => w.name)).toEqual(["Competitor Playbooks"]);
    const ws = wb.getWorksheet("Competitor Playbooks")!;
    expect(ws.getCell("A1").value).toBe("NicheIQ — Competitor Playbooks");
    expect(ws.getCell("A4").value).toBe("Creator");
    expect(ws.getCell("E4").value).toBe("Est. Revenue ($)");
    expect(ws.getCell("A5").value).toBe("ThemeGoods");
    expect(ws.getCell("E5").value).toBe(30000);
    expect(ws.getCell("F5").value).toBe("Regular $59 · Extended $2,950");
  });

  it("handles an empty watchlist without throwing", async () => {
    const buf = await buildCompetitorWorkbook([]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("Competitor Playbooks")!;
    expect(ws.getCell("A4").value).toBe("Creator"); // header still present
  });
});