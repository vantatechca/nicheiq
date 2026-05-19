"use client";

/**
 * Manual print button. The page auto-fires window.print() on load, but
 * if a browser blocks the auto-trigger (Brave, some extensions, etc.)
 * this gives the user a one-click fallback. Hidden in the printed
 * output via the `no-print` class on the parent action bar.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
    >
      Print as PDF
    </button>
  );
}
