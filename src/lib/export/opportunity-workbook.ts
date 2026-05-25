import ExcelJS from "exceljs";
import { PALETTE, thinBorder, titleCase, tierColor } from "./workbook-style";

/**
 * Builds the boss-ready opportunities workbook — three styled sheets:
 *   • Top Candidates    — top 15 real opportunities (score 78+), with a totals row
 *   • All Opportunities — every real opportunity, sorted by score
 *   • By Niche          — demand scoreboard: count / avg score / total revenue
 *
 * Pure: takes already-fetched rows, returns an .xlsx buffer. No DB, no auth —
 * so it's trivially testable and reusable.
 */

export interface OppRow {
  title: string;
  niche: string;
  type: string; // opportunityType
  effort: string; // buildEffort
  status: string;
  score: number;
  revenue: number | null; // projectedRevenueUsd
  createdAt: Date;
}

interface NicheRow {
  niche: string;
  count: number;
  avgScore: number;
  totalRevenue: number;
}

const CANDIDATE_FLOOR = 78;
const TOP_N = 15;

// Visual language is shared with the Products workbook so the two databases
// look identical — see ./workbook-style. These aliases keep the sheet builders
// below readable without churn.
const TITLE_ARGB = PALETTE.title;
const SUBTITLE_ARGB = PALETTE.subtitle;
const HEADER_FILL_ARGB = PALETTE.header;
const BAND_ARGB = PALETTE.band;
const TOTAL_FILL_ARGB = PALETTE.total;

/** Re-exported so existing imports (and tests) keep working unchanged. */
export { titleCase };

/** Score → font color: green for strong, amber for middling, gray for weak. */
export function scoreColor(score: number): string {
  return tierColor(score, 90, 75);
}

const OPP_HEADERS = [
  "Rank",
  "Product Opportunity",
  "Niche",
  "Play Type",
  "Build Effort",
  "Status",
  "Score",
  "Est. Revenue ($)",
  "First Seen",
];
const OPP_WIDTHS = [6, 48, 20, 18, 13, 12, 8, 16, 12];

function addOpportunitySheet(
  wb: ExcelJS.Workbook,
  name: string,
  subtitle: string,
  data: OppRow[],
  withTotals: boolean,
) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4 }] });
  OPP_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:I1");
  const title = ws.getCell("A1");
  title.value = "NicheIQ — Digital Product Opportunities";
  title.font = { bold: true, size: 16, color: { argb: TITLE_ARGB } };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:I2");
  const sub = ws.getCell("A2");
  sub.value = subtitle;
  sub.font = { italic: true, size: 10, color: { argb: SUBTITLE_ARGB } };

  const headerRow = ws.getRow(4);
  OPP_HEADERS.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    c.alignment = { vertical: "middle", horizontal: i >= 6 ? "right" : "left" };
    c.border = thinBorder;
  });
  headerRow.height = 18;

  data.forEach((r, idx) => {
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.title;
    row.getCell(3).value = titleCase(r.niche);
    row.getCell(4).value = titleCase(r.type);
    row.getCell(5).value = titleCase(r.effort);
    row.getCell(6).value = titleCase(r.status);

    const score = row.getCell(7);
    score.value = r.score;
    score.font = { bold: true, color: { argb: scoreColor(r.score) } };
    score.alignment = { horizontal: "right" };

    const rev = row.getCell(8);
    rev.value = r.revenue ?? 0;
    rev.numFmt = '"$"#,##0';
    rev.alignment = { horizontal: "right" };

    const seen = row.getCell(9);
    seen.value = r.createdAt;
    seen.numFmt = "yyyy-mm-dd";
    seen.alignment = { horizontal: "right" };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 9; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_ARGB } };
    }
  });

  const lastDataRow = 4 + data.length;
  if (data.length) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: lastDataRow, column: 9 } };
  }

  if (withTotals && data.length) {
    const totals = ws.getRow(lastDataRow + 1);
    totals.getCell(2).value = "Totals / Averages";
    const avg = Math.round(data.reduce((s, r) => s + r.score, 0) / data.length);
    const sum = data.reduce((s, r) => s + (r.revenue ?? 0), 0);

    const avgCell = totals.getCell(7);
    avgCell.value = avg;
    avgCell.alignment = { horizontal: "right" };
    const sumCell = totals.getCell(8);
    sumCell.value = sum;
    sumCell.numFmt = '"$"#,##0';
    sumCell.alignment = { horizontal: "right" };

    for (let col = 1; col <= 9; col++) {
      const c = totals.getCell(col);
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL_ARGB } };
      c.border = thinBorder;
    }
  }
}

function addNicheSheet(wb: ExcelJS.Workbook, data: NicheRow[]) {
  const ws = wb.addWorksheet("By Niche", { views: [{ state: "frozen", ySplit: 3 }] });
  [22, 16, 12, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:D1");
  const title = ws.getCell("A1");
  title.value = "Demand by niche (live data)";
  title.font = { bold: true, size: 14, color: { argb: TITLE_ARGB } };

  const headers = ["Niche", "# Opportunities", "Avg Score", "Total Est. Revenue ($)"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: i >= 1 ? "right" : "left" };
    c.border = thinBorder;
  });

  data.forEach((n, idx) => {
    const row = ws.getRow(4 + idx);
    row.getCell(1).value = titleCase(n.niche);
    row.getCell(2).value = n.count;
    row.getCell(2).alignment = { horizontal: "right" };
    row.getCell(3).value = n.avgScore;
    row.getCell(3).alignment = { horizontal: "right" };
    const rev = row.getCell(4);
    rev.value = n.totalRevenue;
    rev.numFmt = '"$"#,##0';
    rev.alignment = { horizontal: "right" };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 4; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_ARGB } };
    }
  });

  if (data.length) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + data.length, column: 4 } };
  }
}

/** Aggregate rows into the by-niche scoreboard, sorted by opportunity count. */
export function aggregateByNiche(rows: OppRow[]): NicheRow[] {
  const map = new Map<string, { count: number; scoreSum: number; revenue: number }>();
  for (const r of rows) {
    const m = map.get(r.niche) ?? { count: 0, scoreSum: 0, revenue: 0 };
    m.count += 1;
    m.scoreSum += r.score;
    m.revenue += r.revenue ?? 0;
    map.set(r.niche, m);
  }
  return [...map.entries()]
    .map(([niche, m]) => ({
      niche,
      count: m.count,
      avgScore: Math.round(m.scoreSum / m.count),
      totalRevenue: m.revenue,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Build the full workbook from all real opportunity rows (already sorted by
 * score desc). Returns an .xlsx buffer ready to stream to the client.
 */
export async function buildOpportunityWorkbook(allRows: OppRow[]): Promise<ArrayBuffer> {
  const topRows = allRows.filter((r) => r.score >= CANDIDATE_FLOOR).slice(0, TOP_N);
  const byNiche = aggregateByNiche(allRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NicheIQ";
  wb.created = new Date();

  addOpportunitySheet(
    wb,
    "Top Candidates",
    `Top ${topRows.length} REAL candidates (score ${CANDIDATE_FLOOR}+, seed/demo data excluded), of ${allRows.length} live opportunities. Sorted by score.`,
    topRows,
    true,
  );
  addOpportunitySheet(
    wb,
    "All Opportunities",
    `All ${allRows.length} live opportunities (seed/demo excluded), sorted by score.`,
    allRows,
    false,
  );
  addNicheSheet(wb, byNiche);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}