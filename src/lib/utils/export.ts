// src/lib/utils/export.ts
// Export helpers, two families:
//   • Data exports — downloadCsv(filename, rows) / downloadJson(filename, data).
//     GENERIC: CSV columns are derived from each row object's keys, so every
//     entity (opportunities, products, creators, resellable…) exports exactly
//     the fields the caller maps. Signature is (filename, data).
//   • printReport(rows, meta) — a branded, print-ready opportunity report
//     (optional; wire to a "Print report" button when you want it).
// Client-side only (Blob / window / document).

type Row = Record<string, unknown>;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- CSV (generic) ----------
const csvEscape = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const toCell = (v: unknown): string =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** Columns = the union of all row keys, in first-seen order. */
export function buildCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const keys: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const header = keys.map((k) => csvEscape(k)).join(",");
  const lines = rows.map((r) => keys.map((k) => csvEscape(toCell(r[k]))).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, rows: Row[]) {
  // BOM so Excel reads UTF-8 correctly.
  triggerDownload(new Blob(["\uFEFF" + buildCsv(rows)], { type: "text/csv;charset=utf-8;" }), filename);
}

export function downloadJson(filename: string, data: unknown) {
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

// ---------- Printable / PDF report (opportunities) ----------
const humanize = (v: unknown) =>
  v == null ? "" : String(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const usd = (v: unknown) =>
  Number(v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateFmt = (v: unknown) => {
  if (!v) return "";
  const d = new Date(String(v));
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k] != null) return r[k];
  return undefined;
};
const summaryOf = (r: Row) => pick(r, "summary", "description") ?? "";
const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

interface Column {
  label: string;
  get: (r: Row) => unknown;
  fmt?: (v: unknown) => string;
  align?: "right";
}
const COLUMNS: Column[] = [
  { label: "Title", get: (r) => r.title },
  { label: "Niche", get: (r) => r.niche, fmt: humanize },
  { label: "Type", get: (r) => pick(r, "opportunityType", "type"), fmt: humanize },
  { label: "Build Effort", get: (r) => r.buildEffort, fmt: humanize },
  { label: "Status", get: (r) => r.status, fmt: humanize },
  { label: "Score", get: (r) => r.score, fmt: (v) => String(Math.round(Number(v ?? 0))), align: "right" },
  { label: "Projected Revenue", get: (r) => pick(r, "projectedRevenueUsd", "projectedRevenue"), fmt: usd, align: "right" },
  { label: "Discovered", get: (r) => pick(r, "createdAt", "created_at"), fmt: dateFmt },
];
const cell = (c: Column, r: Row) => {
  const raw = c.get(r);
  return c.fmt ? c.fmt(raw) : raw == null ? "" : String(raw);
};

export interface ReportMeta {
  title?: string;
  subtitle?: string;
}

export function printReport(rows: Row[], meta: ReportMeta = {}) {
  const title = meta.title ?? "Opportunity Report";
  const generated = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  const count = rows.length;
  const avgScore = count ? Math.round(rows.reduce((s, r) => s + Number(r.score ?? 0), 0) / count) : 0;
  const totalRev = rows.reduce(
    (s, r) => s + Number(pick(r, "projectedRevenueUsd", "projectedRevenue") ?? 0),
    0,
  );

  const head = COLUMNS.map((c) => `<th class="${c.align === "right" ? "num" : ""}">${escapeHtml(c.label)}</th>`).join("");
  const items = rows
    .map((r) => {
      const main = `<tr>${COLUMNS.map((c) => `<td class="${c.align === "right" ? "num" : ""}">${escapeHtml(cell(c, r))}</td>`).join("")}</tr>`;
      const s = String(summaryOf(r)).trim();
      const desc = s ? `<tr class="desc"><td colspan="${COLUMNS.length}">${escapeHtml(s)}</td></tr>` : "";
      return `<tbody class="item">${main}${desc}</tbody>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    :root{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#0369a1;--band:#f8fafc}
    *{box-sizing:border-box}
    body{margin:0;color:var(--ink);font:13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff}
    .page{max-width:1000px;margin:0 auto;padding:40px}
    header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--ink);padding-bottom:16px}
    .brand{font-weight:800;letter-spacing:-.02em;font-size:22px}.brand span{color:var(--accent)}
    h1{font-size:18px;margin:14px 0 2px;font-weight:700}.sub{color:var(--muted);font-size:12px}
    .meta{color:var(--muted);font-size:11px;text-align:right}
    .summary{display:flex;gap:28px;margin:20px 0 24px;padding:16px 20px;background:var(--band);border:1px solid var(--line);border-radius:8px}
    .summary div{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .summary strong{display:block;font-size:20px;color:var(--ink);margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--line);padding:8px 10px}
    tbody.item{break-inside:avoid;border-bottom:1px solid var(--line)}
    tbody.item:nth-of-type(even){background:#fafcff}
    tbody.item td{padding:8px 10px;border:none;vertical-align:top}
    td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    tr.desc td{padding-top:0;padding-bottom:10px;color:var(--muted);font-size:11px;line-height:1.45}
    .foot{margin-top:18px;color:var(--muted);font-size:10px;text-align:center}
    .bar{position:fixed;top:16px;right:16px}.bar button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:var(--accent);color:#fff;cursor:pointer}
    @media print{.bar{display:none}.page{padding:0;max-width:none}thead{display:table-header-group}@page{margin:16mm}}
  </style></head><body>
    <div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="page">
      <header><div><div class="brand">Niche<span>IQ</span></div><h1>${escapeHtml(title)}</h1>${meta.subtitle ? `<div class="sub">${escapeHtml(meta.subtitle)}</div>` : ""}</div>
      <div class="meta">Generated ${escapeHtml(generated)}<br>${count} opportunities</div></header>
      <div class="summary"><div>Opportunities<strong>${count}</strong></div><div>Avg score<strong>${avgScore}</strong></div><div>Total projected revenue<strong>${usd(totalRev)}</strong></div></div>
      <table><thead><tr>${head}</tr></thead>${items}</table>
      <div class="foot">NicheIQ — Confidential · Generated ${escapeHtml(generated)}</div>
    </div></body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Pop-up blocked — allow pop-ups for this site to print the report.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
}