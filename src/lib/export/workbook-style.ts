import ExcelJS from "exceljs";

/**
 * Shared visual language for the boss-ready Excel exports, so the Products
 * (Database 1) and Opportunities (Database 2) workbooks look identical and
 * can never drift apart. The palette matches the approved reference workbook
 * exactly (deep-navy title, indigo header, green/amber numeric highlights,
 * subtle zebra striping).
 */
export const PALETTE = {
  title: "FF1F3A5F", // deep navy — sheet titles
  subtitle: "FF5F5E5A", // warm gray — subtitles
  header: "FF534AB7", // indigo — header row fill
  band: "FFF7F7FA", // near-white — zebra striping
  total: "FFEDEBFB", // light indigo — totals row
  border: "FFE5E7EB", // hairline — cell borders
} as const;

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: PALETTE.border } },
  left: { style: "thin", color: { argb: PALETTE.border } },
  bottom: { style: "thin", color: { argb: PALETTE.border } },
  right: { style: "thin", color: { argb: PALETTE.border } },
};

/** snake_case enum value → "Title Case" for display. */
export function titleCase(s: string): string {
  return s
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Numeric highlight color: green when strong, amber when middling, gray when
 * weak. Thresholds differ per metric (opportunity score vs product revenue),
 * so callers pass the cutoffs.
 */
export function tierColor(value: number, greenAt: number, amberAt: number): string {
  if (value >= greenAt) return "FF1D9E75"; // green
  if (value >= amberAt) return "FFBA7517"; // amber
  return "FF6B7280"; // gray
}