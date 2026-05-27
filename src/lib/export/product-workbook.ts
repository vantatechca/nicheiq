import ExcelJS from "exceljs";
import { PALETTE, thinBorder, titleCase, tierColor } from "./workbook-style";

/**
 * Builds the boss-ready PRODUCTS workbook (Database 1) — the proven winners —
 * with three styled sheets that match the Opportunities workbook exactly:
 *   • Top Candidates — highest-revenue products with REAL sales data (≥ floor)
 *   • All Products   — every real product, ranked by LAST SEEN (freshest first)
 *   • By Niche       — scoreboard splitting sales-derived revenue from total
 *
 * Basis-aware: only "sales-derived" figures (Envato's real lifetime-sales
 * estimates) are treated as proven. Proxy estimates (Etsy favourites, etc.)
 * still appear, but are visually muted and excluded from the proven-winners
 * sheet and the sales-derived revenue column.
 *
 * Pure: takes already-fetched rows, returns an .xlsx buffer. No DB, no auth.
 */

export interface ProductRow {
  title: string;
  niche: string;
  platform: string; // sourcePlatform
  sales: number | null; // representative est. monthly sales
  revenue: number | null; // representative est. monthly revenue (USD)
  basis: string; // revenueBasis — how the figure was derived
  firstSeenAt: Date;
  lastSeenAt: Date;
}

// Legacy aggregate shape — kept stable for existing consumers/tests.
interface NicheRow {
  niche: string;
  count: number;
  avgRevenue: number;
  totalRevenue: number;
}

// Richer, basis-aware aggregate used by the By Niche sheet.
interface NicheBreakdown {
  niche: string;
  count: number;
  realCount: number; // products backed by real sales data
  salesDerivedRevenue: number; // sum of sales-derived revenue only
  totalRevenue: number; // sum of all revenue (incl. proxy)
}

// The one basis we treat as hard evidence. Matches the `rev:sales-derived` tag
// the Envato crawler stamps via revenueBasisTag().
const REAL_BASIS = "sales-derived";

// A "very high success" product floors at $2k/mo estimated revenue — same bar
// as the products "Export winners" preset.
const CANDIDATE_FLOOR = 2000;
const TOP_N = 15;

// Revenue highlight thresholds (monthly USD): green = strong, amber = solid.
const REV_GREEN_AT = 5000;
const REV_AMBER_AT = 1500;

const TITLE_ARGB = PALETTE.title;
const SUBTITLE_ARGB = PALETTE.subtitle;
const HEADER_FILL_ARGB = PALETTE.header;
const BAND_ARGB = PALETTE.band;
const TOTAL_FILL_ARGB = PALETTE.total;

const PRODUCT_HEADERS = [
  "Rank",
  "Product",
  "Niche",
  "Platform",
  "Est. Sales / mo",
  "Est. Revenue ($)",
  "Revenue Basis",
  "Last Seen",
  "First Seen",
];
const PRODUCT_WIDTHS = [6, 48, 18, 14, 14, 18, 16, 12, 12];

function addProductSheet(
  wb: ExcelJS.Workbook,
  name: string,
  subtitle: string,
  data: ProductRow[],
  withTotals: boolean,
) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4 }] });
  PRODUCT_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:I1");
  const title = ws.getCell("A1");
  title.value = "NicheIQ — Digital Product Winners";
  title.font = { bold: true, size: 16, color: { argb: TITLE_ARGB } };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:I2");
  const sub = ws.getCell("A2");
  sub.value = subtitle;
  sub.font = { italic: true, size: 10, color: { argb: SUBTITLE_ARGB } };

  const headerRow = ws.getRow(4);
  PRODUCT_HEADERS.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    // Numeric / date columns (5–9) right-aligned, text columns left.
    c.alignment = { vertical: "middle", horizontal: i >= 4 ? "right" : "left" };
    c.border = thinBorder;
  });
  headerRow.height = 18;

  data.forEach((r, idx) => {
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.title;
    row.getCell(3).value = titleCase(r.niche);
    row.getCell(4).value = titleCase(r.platform);

    const sales = row.getCell(5);
    sales.value = r.sales ?? 0;
    sales.numFmt = "#,##0";
    sales.alignment = { horizontal: "right" };

    const rev = row.getCell(6);
    rev.value = r.revenue ?? 0;
    rev.numFmt = '"$"#,##0';
    // Only REAL (sales-derived) revenue gets the bold green/amber confidence
    // tiering. Proxy estimates render muted so the eye trusts the coloured
    // numbers and treats the rest as soft.
    const isReal = r.basis === REAL_BASIS;
    rev.font = isReal
      ? { bold: true, color: { argb: tierColor(r.revenue ?? 0, REV_GREEN_AT, REV_AMBER_AT) } }
      : { italic: true, color: { argb: SUBTITLE_ARGB } };
    rev.alignment = { horizontal: "right" };

    row.getCell(7).value = titleCase(r.basis);
    row.getCell(7).alignment = { horizontal: "right" };

    const last = row.getCell(8);
    last.value = r.lastSeenAt;
    last.numFmt = "yyyy-mm-dd";
    last.alignment = { horizontal: "right" };

    const first = row.getCell(9);
    first.value = r.firstSeenAt;
    first.numFmt = "yyyy-mm-dd";
    first.alignment = { horizontal: "right" };

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
    const salesSum = data.reduce((s, r) => s + (r.sales ?? 0), 0);
    const revSum = data.reduce((s, r) => s + (r.revenue ?? 0), 0);

    const salesCell = totals.getCell(5);
    salesCell.value = salesSum;
    salesCell.numFmt = "#,##0";
    salesCell.alignment = { horizontal: "right" };

    const revCell = totals.getCell(6);
    revCell.value = revSum;
    revCell.numFmt = '"$"#,##0';
    revCell.alignment = { horizontal: "right" };

    for (let col = 1; col <= 9; col++) {
      const c = totals.getCell(col);
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL_ARGB } };
      c.border = thinBorder;
    }
  }
}

function addNicheSheet(wb: ExcelJS.Workbook, data: NicheBreakdown[]) {
  const ws = wb.addWorksheet("By Niche", { views: [{ state: "frozen", ySplit: 3 }] });
  [24, 12, 16, 20, 20].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:E1");
  const title = ws.getCell("A1");
  title.value = "Demand by niche (live data)";
  title.font = { bold: true, size: 14, color: { argb: TITLE_ARGB } };

  const headers = [
    "Niche",
    "# Products",
    "# w/ Sales Data",
    "Sales-Derived Rev ($)",
    "Total Est. Rev ($)",
  ];
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

    row.getCell(3).value = n.realCount;
    row.getCell(3).alignment = { horizontal: "right" };

    // Real money bold + colour-tiered; total muted so attention lands on the
    // trustworthy figure.
    const real = row.getCell(4);
    real.value = n.salesDerivedRevenue;
    real.numFmt = '"$"#,##0';
    real.font = {
      bold: true,
      color: { argb: tierColor(n.salesDerivedRevenue, REV_GREEN_AT, REV_AMBER_AT) },
    };
    real.alignment = { horizontal: "right" };

    const tot = row.getCell(5);
    tot.value = n.totalRevenue;
    tot.numFmt = '"$"#,##0';
    tot.font = { italic: true, color: { argb: SUBTITLE_ARGB } };
    tot.alignment = { horizontal: "right" };

    const band = idx % 2 === 1;
    for (let col = 1; col <= 5; col++) {
      const c = row.getCell(col);
      c.border = thinBorder;
      if (band) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_ARGB } };
    }
  });

  if (data.length) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + data.length, column: 5 } };
  }
}

/**
 * Legacy by-niche aggregate: count / avg revenue / total revenue, sorted by
 * product count desc. UNCHANGED shape + behaviour — kept for existing consumers
 * and tests. Prefer aggregateByNicheWithBasis for new work.
 */
export function aggregateByNiche(rows: ProductRow[]): NicheRow[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const r of rows) {
    const m = map.get(r.niche) ?? { count: 0, revenue: 0 };
    m.count += 1;
    m.revenue += r.revenue ?? 0;
    map.set(r.niche, m);
  }
  return [...map.entries()]
    .map(([niche, m]) => ({
      niche,
      count: m.count,
      avgRevenue: Math.round(m.revenue / m.count),
      totalRevenue: Math.round(m.revenue),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Basis-aware by-niche aggregate. Splits real (sales-derived) revenue from the
 * proxy-inclusive total so weak guesses can't inflate a niche's apparent money.
 * Sorted by sales-derived revenue desc — where the REAL money is, first.
 */
export function aggregateByNicheWithBasis(rows: ProductRow[]): NicheBreakdown[] {
  const map = new Map<
    string,
    { count: number; realCount: number; salesDerivedRevenue: number; totalRevenue: number }
  >();
  for (const r of rows) {
    const m =
      map.get(r.niche) ?? { count: 0, realCount: 0, salesDerivedRevenue: 0, totalRevenue: 0 };
    const rev = r.revenue ?? 0;
    m.count += 1;
    m.totalRevenue += rev;
    if (r.basis === REAL_BASIS) {
      m.realCount += 1;
      m.salesDerivedRevenue += rev;
    }
    map.set(r.niche, m);
  }
  return [...map.entries()]
    .map(([niche, m]) => ({
      niche,
      count: m.count,
      realCount: m.realCount,
      salesDerivedRevenue: Math.round(m.salesDerivedRevenue),
      totalRevenue: Math.round(m.totalRevenue),
    }))
    .sort((a, b) => b.salesDerivedRevenue - a.salesDerivedRevenue || b.count - a.count);
}

/**
 * Build the products workbook from all real product rows. Top Candidates is the
 * PROVEN winners — sales-derived revenue only, above the floor — so favourites-
 * proxy guesses can't masquerade as winners. All Products is ranked by last
 * seen (freshest first). Returns an .xlsx buffer.
 */
export async function buildProductWorkbook(allRows: ProductRow[]): Promise<ArrayBuffer> {
  const byRevenue = [...allRows].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
  const topRows = byRevenue
    .filter((r) => (r.revenue ?? 0) >= CANDIDATE_FLOOR)
    .slice(0, TOP_N);
  const byLastSeen = [...allRows].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  const byNiche = aggregateByNicheWithBasis(allRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NicheIQ";
  wb.created = new Date();

  addProductSheet(
    wb,
    "Top Candidates",
    `Top ${topRows.length} winners (≥ $${CANDIDATE_FLOOR.toLocaleString()}/mo est.) of ${allRows.length} live products, by revenue. Sales-derived shown bold; proxy estimates muted — see the Basis column.`,
    topRows,
    true,
  );
  addProductSheet(
    wb,
    "All Products",
    `All ${allRows.length} live products (seed/demo excluded), ranked by last seen. Proxy-based revenue shown muted.`,
    byLastSeen,
    false,
  );
  addNicheSheet(wb, byNiche);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}