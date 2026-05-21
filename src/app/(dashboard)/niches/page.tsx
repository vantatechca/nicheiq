// Destination: src/app/(dashboard)/niches/page.tsx  (REPLACES current)
//
// The list is now fetched live from /api/niches (which computes the per-niche
// aggregates). Fetching moves into the client view via useApi — same pattern as
// the niche detail page — so this server file is just a thin shell that passes
// the initial view-mode through. No more mockNiches import.

import { NichesView } from "./niches-view";

export const dynamic = "force-dynamic";

type SP = Promise<{ view?: string }>;

export default async function NichesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "treemap" ? "treemap" : "grid";
  return <NichesView initialView={view} />;
}