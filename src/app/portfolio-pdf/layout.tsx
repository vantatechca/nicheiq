import type { ReactNode } from "react";

/**
 * Minimal layout for the print/PDF view. Sits OUTSIDE the (dashboard)
 * route group on purpose — we don't want the sidebar, topbar, or
 * shortcuts overlay polluting the printed page.
 *
 * The root layout still wraps this (Providers, Toaster, dark mode
 * class), but we override the body/html colors with print-friendly
 * white via inline style on the wrapping div + the @media print
 * rules embedded in the page.
 */
export default function PortfolioPdfLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: "light" }}>
      {children}
    </div>
  );
}