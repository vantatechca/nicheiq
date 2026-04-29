// Server Component for /niches. The page is mostly a layout: there are no
// filters to apply on the server, just sort by momentum desc. The view toggle
// (grid vs treemap) is purely UI state and stays in the client.
//
// Putting the sort here so when you wire the real DB, a single ORDER BY moves
// to SQL instead of running in JS.

import { mockNiches } from "@/mock/data";
import { NichesView } from "./niches-view";

export const dynamic = "force-dynamic";

type SP = Promise<{
  view?: string;
}>;

export default async function NichesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "treemap" ? "treemap" : "grid";

  const niches = [...mockNiches].sort((a, b) => b.momentumScore - a.momentumScore);

  return <NichesView niches={niches} initialView={view} />;
}