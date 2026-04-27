"use client";

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(filename, blob);
}

export function downloadCsv<T extends Record<string, unknown>>(filename: string, rows: T[]) {
  if (rows.length === 0) {
    triggerDownload(filename, new Blob(["(empty)"], { type: "text/csv" }));
    return;
  }
  const cols = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const escape = (v: unknown) => {
    if (v == null) return "";
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    }
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
