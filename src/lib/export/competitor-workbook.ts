import ExcelJS from "exceljs";
import { PALETTE, thinBorder, titleCase, tierColor } from "./workbook-style";

/**
 * Builds the Competitor Playbooks workbook — a single styled sheet matching the
 * Products / Opportunities / Creators look. Unlike those (bulk ranked data),
 * this is the curated deep-dive watchlist: one row per tracked competitor with
 * the creator's stats plus the qualitative playbook (pricing tiers, notes).
 *
 * Pure: takes already-fetched/flattened rows, returns an .xlsx buffer.
 */

export interface CompetitorRow {
  creator: string;
  platform: string;
  depth: string;
  followers: number | null;
  revenue: number;
  pricingTiers: string; // pre-flattened, e.g. "Starter $9 · Pro $29"
  notes: string;
}

// Creator revenue highlight thresholds (USD), same as the Creators workbook.
const REV_GREEN_AT = 20000;
const REV_AMBER_AT = 5000;

const HEADERS = [
  "Creator",
  "Platform",
  "Depth",
  "Followers",
  "Est. Revenue ($)",
  "Pricing Tiers",
  "Notes",
];
const WIDTHS = [28, 16, 10, 14, 18, 40, 50];

export async function buildCompetitorWorkbook(rows: CompetitorRow[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NicheIQ";
  wb.created = new Date();

  const ws = wb.addWorksheet("Competitor Playbooks", { views: [{ state: "frozen", ySplit: 4 }] });
  WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:G1");
  const title = ws.getCell("A1");
  title.value = "NicheIQ — Competitor Playbooks";
  title.font = { bold: true, size: 16, color: { argb: PALETTE.title } };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:G2");
  const sub = ws.getCell("A2");
  sub.value = `Curated deep-dive watchlist — ${rows.length} tracked competitor${rows.length === 1 ? "" : "s"}.`;
  sub.font = { italic: true, size: 10, color: { argb: PALETTE.subtitle } };

  const headerRow = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALETTE.header } };
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    // Numeric columns (Followers=4, Revenue=5) right-aligned; rest left.
    c.alignment = { vertical: "middle", horizontal: i === 3 || i === 4 ? "right" : "left" };
    c.border = thinBorder;
  });
  headerRow.height = 18;

  rows.forEach((r, idx) => {
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = r.creator;
    row.getCell(2).value = titleCase(r.platform);
    row.getCell(3).value = titleCase(r.depth);

    const f = row.getCell(4);
    f.value = r.followers ?? 0;
    f.numFmt = "#,##0";
    f.alignment = { horizontal: "right" };

    const rev = row.getCell(5);
    rev.value = r.revenue;
    rev.numFmt = '"$"#,##0';
    rev.font = { bold: true, color: { argb: tierColor(r.revenue, REV_GREEN_AT, REV_AMBER_AT) } };
    rev.alignment = { horizontal: "right" };

    const pt = row.getCell(6);
    pt.value = r.pricingTiers;
    pt.alignment = { wrapText: true, vertical: "top" };

    const nt = row.getCell(7);
    nt.value = r.notes;
    nt.alignment = { wrapText: true, vertical: "top" };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 7; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALETTE.band } };
    }
  });

  if (rows.length) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: 7 } };
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}