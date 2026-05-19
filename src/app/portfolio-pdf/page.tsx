import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDb } from "@/lib/db/client";
import { products, opportunities } from "@/lib/db/schema";
import { formatUsd, formatRange, formatDate } from "@/lib/utils/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/**
 * Print-optimized view of your launched-product portfolio. Reachable
 * via the "Export PDF" button on /products?view=mine. Designed for the
 * boss-demo workflow:
 *
 *   1. User clicks Export PDF on /products
 *   2. New tab opens at /portfolio-pdf
 *   3. Page auto-fires window.print() after content settles
 *   4. Browser print dialog appears, "Save as PDF" is the default
 *      destination on every modern browser
 *   5. User clicks Save → clean PDF on disk
 *
 * Layout decisions:
 *   - White background, dark serif text — prints cleanly, looks
 *     professional, no wasted ink on dark backgrounds
 *   - Each launched product gets its own block with page-break-inside:
 *     avoid so cards don't split awkwardly
 *   - AI rationale from the linked opportunity is included since that's
 *     the most distinctive artefact ("a junior PM didn't write this")
 *   - "Generated on …" footer so the printed page has its own audit trail
 */
export default async function PortfolioPdfPage() {
  // Auth gate — same pattern as the (dashboard) layout uses. Print pages
  // should not be public, since they show portfolio + revenue projections.
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userName =
    (session.user as { name?: string }).name ??
    (session.user as { email?: string }).email ??
    "Andrei Dutescu";

  const db = getDb();

  // Fetch all launched products joined with their source opportunities.
  // Left join because opportunityId is set but the linked opportunity row
  // could theoretically be missing (FK is SET NULL on delete — defensive).
  const rows = await db
    .select({
      product: products,
      opportunity: opportunities,
    })
    .from(products)
    .leftJoin(opportunities, eq(products.opportunityId, opportunities.id))
    .where(isNotNull(products.opportunityId))
    .orderBy(desc(products.firstSeenAt));

  // Aggregate stats for the header summary.
  const totalProducts = rows.length;
  const totalProjectedRevenue = rows.reduce(
    (sum, r) => sum + (r.opportunity?.projectedRevenueUsd ?? 0),
    0,
  );
  const uniqueNiches = new Set(rows.map((r) => r.product.niche)).size;
  const launched = rows.filter((r) => r.opportunity?.status === "launched").length;

  return (
    <>
      {/* Print-only styles. Most rules apply only inside @media print so
          the on-screen preview stays readable. The key things:
            - hide the "Print as PDF" action bar
            - guarantee white background and black text (some browsers
              flip these in dark mode)
            - prevent cards from breaking across pages
            - tighter margins on the actual paper */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              .product-card { page-break-inside: avoid; break-inside: avoid; }
              body { background: white !important; color: #0F172A !important; }
              @page { margin: 1.5cm; size: letter; }
            }
            .serif { font-family: Georgia, "Times New Roman", serif; }
          `,
        }}
      />

      {/* Auto-trigger the print dialog ~600ms after load so images and
          fonts have time to settle. The user can dismiss if they only
          wanted to view. Wrapped in window.print availability check for
          defensive safety. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (typeof window === "undefined" || !window.print) return;
              window.addEventListener("load", function() {
                setTimeout(function() { window.print(); }, 600);
              });
            })();
          `,
        }}
      />

      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Action bar — hidden in the printed output, visible on-screen
            so the user has a manual fallback if the auto-print is
            blocked by their browser. */}
        <div className="no-print mb-6 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="text-slate-600">
            Print dialog should appear automatically. If not, click the button on the right or press{" "}
            <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">Ctrl/⌘+P</kbd>.
          </div>
          <div className="flex gap-2">
            <Link
              href="/products?view=mine"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              ← Back to Products
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="mb-8 border-b border-slate-300 pb-6">
          <div className="text-xs uppercase tracking-widest text-emerald-700">
            Product Portfolio
          </div>
          <h1 className="serif mt-1 text-4xl font-bold text-slate-900">NicheIQ</h1>
          <p className="mt-2 text-sm italic text-slate-600">
            Launched digital products tracked from AI-generated opportunities.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>
              <strong className="text-slate-700">By:</strong> {userName}
            </span>
            <span>
              <strong className="text-slate-700">Generated:</strong>{" "}
              {formatDate(new Date(), "MMM d, yyyy · HH:mm")}
            </span>
          </div>
        </header>

        {/* ── Summary stats ─────────────────────────────────────────── */}
        <section className="mb-10 grid grid-cols-4 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <Stat label="Launched Products" value={String(totalProducts)} />
          <Stat label="In Production" value={String(launched)} />
          <Stat label="Niches Covered" value={String(uniqueNiches)} />
          <Stat
            label="Total Projected Revenue"
            value={formatUsd(totalProjectedRevenue, { compact: true })}
            highlight
          />
        </section>

        {/* ── Per-product cards ─────────────────────────────────────── */}
        {totalProducts === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No launched products yet. Graduate an opportunity from <code>/opportunities</code> to
            see it here.
          </div>
        ) : (
          <div className="space-y-6">
            {rows.map(({ product, opportunity }, idx) => (
              <article
                key={product.id}
                className="product-card rounded-md border border-slate-300 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-slate-500">
                      #{String(idx + 1).padStart(2, "0")} ·{" "}
                      {product.sourcePlatform.replace(/_/g, " ")}
                    </div>
                    <h2 className="serif mt-1 text-2xl font-bold text-slate-900">
                      {product.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        <strong>Niche:</strong> {product.niche.replace(/_/g, " ")}
                      </span>
                      <span>
                        <strong>Launched:</strong> {formatDate(product.firstSeenAt)}
                      </span>
                      {opportunity ? (
                        <span>
                          <strong>Status:</strong> {opportunity.status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {opportunity?.score != null ? (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-emerald-700">{opportunity.score}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        Score
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Key metrics row */}
                <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      Price
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900">
                      {product.priceUsd != null ? formatUsd(product.priceUsd) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      Est. Revenue (mo)
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900">
                      {formatRange(product.estMonthlyRevenueLow, product.estMonthlyRevenueHigh)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      Projected (Opportunity)
                    </div>
                    <div className="mt-0.5 font-medium text-emerald-700">
                      {opportunity?.projectedRevenueUsd != null
                        ? formatUsd(opportunity.projectedRevenueUsd)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* AI rationale — the most distinctive artefact */}
                {opportunity?.aiRationale ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-700">
                      Why we launched this — Claude's rationale
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                      {opportunity.aiRationale}
                    </p>
                  </div>
                ) : null}

                {/* Source URL — for the boss to verify the product is real */}
                <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <strong>Source:</strong>{" "}
                  <a href={product.sourceUrl} className="text-emerald-700 underline">
                    {product.sourceUrl}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-500">
          Generated from NicheIQ · AI-driven digital product discovery ·{" "}
          {formatDate(new Date(), "MMM d, yyyy")}
        </footer>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div
        className={`serif mt-1 text-2xl font-bold ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
