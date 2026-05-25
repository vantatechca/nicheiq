import ExcelJS from "exceljs";
import { PALETTE, thinBorder, titleCase, tierColor } from "./workbook-style";

/**
 * Builds the boss-ready CREATORS workbook — the sellers behind the winners —
 * with three styled sheets matching the Products / Opportunities workbooks:
 *   • Top Creators  — top 15 by total est. revenue, with a totals row
 *   • All Creators  — every creator, ranked by total est. revenue
 *   • By Niche      — how many creators are active in each niche
 *
 * Pure: takes already-fetched rows, returns an .xlsx buffer.
 */

export interface CreatorRow {
  handle: string;
  displayName: string;
  platform: string;
  productCount: number;
  totalRevenue: number; // summed est. monthly revenue across their catalog
  niches: string[];
  profileUrl: string;
}

interface NicheRow {
  niche: string;
  creatorCount: number;
}

const TOP_N = 15;

// Total est. monthly revenue highlight thresholds (USD).
const REV_GREEN_AT = 20000;
const REV_AMBER_AT = 5000;

const TITLE_ARGB = PALETTE.title;
const SUBTITLE_ARGB = PALETTE.subtitle;
const HEADER_FILL_ARGB = PALETTE.header;
const BAND_ARGB = PALETTE.band;
const TOTAL_FILL_ARGB = PALETTE.total;

const CREATOR_HEADERS = [
  "Rank",
  "Creator",
  "Platform",
  "# Products",
  "Total Est. Revenue / mo ($)",
  "Niches",
  "Profile",
];
const CREATOR_WIDTHS = [6, 28, 16, 12, 24, 44, 40];

function addCreatorSheet(
  wb: ExcelJS.Workbook,
  name: string,
  subtitle: string,
  data: CreatorRow[],
  withTotals: boolean,
) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4 }] });
  CREATOR_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:G1");
  const title = ws.getCell("A1");
  title.value = "NicheIQ — Top Creators";
  title.font = { bold: true, size: 16, color: { argb: TITLE_ARGB } };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:G2");
  const sub = ws.getCell("A2");
  sub.value = subtitle;
  sub.font = { italic: true, size: 10, color: { argb: SUBTITLE_ARGB } };

  const headerRow = ws.getRow(4);
  CREATOR_HEADERS.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    // Numeric columns (4–5) right-aligned; text columns left.
    c.alignment = { vertical: "middle", horizontal: i === 3 || i === 4 ? "right" : "left" };
    c.border = thinBorder;
  });
  headerRow.height = 18;

  data.forEach((r, idx) => {
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.displayName;
    row.getCell(3).value = titleCase(r.platform);

    const count = row.getCell(4);
    count.value = r.productCount;
    count.numFmt = "#,##0";
    count.alignment = { horizontal: "right" };

    const rev = row.getCell(5);
    rev.value = r.totalRevenue;
    rev.numFmt = '"$"#,##0';
    rev.font = {
      bold: true,
      color: { argb: tierColor(r.totalRevenue, REV_GREEN_AT, REV_AMBER_AT) },
    };
    rev.alignment = { horizontal: "right" };

    row.getCell(6).value = r.niches.map(titleCase).join(", ");

    const link = row.getCell(7);
    link.value = { text: r.profileUrl, hyperlink: r.profileUrl };
    link.font = { color: { argb: "FF534AB7" }, underline: true };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 7; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_ARGB } };
    }
  });

  const lastDataRow = 4 + data.length;
  if (data.length) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: lastDataRow, column: 7 } };
  }

  if (withTotals && data.length) {
    const totals = ws.getRow(lastDataRow + 1);
    totals.getCell(2).value = "Totals";
    const prodSum = data.reduce((s, r) => s + r.productCount, 0);
    const revSum = data.reduce((s, r) => s + r.totalRevenue, 0);

    const prodCell = totals.getCell(4);
    prodCell.value = prodSum;
    prodCell.numFmt = "#,##0";
    prodCell.alignment = { horizontal: "right" };

    const revCell = totals.getCell(5);
    revCell.value = revSum;
    revCell.numFmt = '"$"#,##0';
    revCell.alignment = { horizontal: "right" };

    for (let col = 1; col <= 7; col++) {
      const c = totals.getCell(col);
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL_ARGB } };
      c.border = thinBorder;
    }
  }
}

function addNicheSheet(wb: ExcelJS.Workbook, data: NicheRow[]) {
  const ws = wb.addWorksheet("By Niche", { views: [{ state: "frozen", ySplit: 3 }] });
  [28, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:B1");
  const title = ws.getCell("A1");
  title.value = "Active sellers by niche (live data)";
  title.font = { bold: true, size: 14, color: { argb: TITLE_ARGB } };

  const headers = ["Niche", "# Creators"];
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
    row.getCell(2).value = n.creatorCount;
    row.getCell(2).alignment = { horizontal: "right" };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 2; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_ARGB } };
    }
  });

  if (data.length) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + data.length, column: 2 } };
  }
}

/** Count how many creators are active in each niche, sorted by count desc. */
export function aggregateByNiche(rows: CreatorRow[]): NicheRow[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    for (const niche of new Set(r.niches)) {
      map.set(niche, (map.get(niche) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([niche, creatorCount]) => ({ niche, creatorCount }))
    .sort((a, b) => b.creatorCount - a.creatorCount);
}

/**
 * Build the creators workbook from all rows (sorted by total revenue desc).
 * Returns an .xlsx buffer ready to stream to the client.
 */
export async function buildCreatorWorkbook(allRows: CreatorRow[]): Promise<ArrayBuffer> {
  const byRevenue = [...allRows].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topRows = byRevenue.slice(0, TOP_N);
  const byNiche = aggregateByNiche(allRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NicheIQ";
  wb.created = new Date();

  addCreatorSheet(
    wb,
    "Top Creators",
    `Top ${topRows.length} creators by total est. monthly revenue, of ${allRows.length} tracked. Sorted by revenue.`,
    topRows,
    true,
  );
  addCreatorSheet(
    wb,
    "All Creators",
    `All ${allRows.length} tracked creators, ranked by total est. monthly revenue. Seed/demo excluded.`,
    byRevenue,
    false,
  );
  addNicheSheet(wb, byNiche);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}