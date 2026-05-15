// Intentional alias of /api/feed/sse. The two routes exist as separate URLs
// so that schema-level filtering (raw vs scored) can diverge later without
// breaking client subscriptions. Until then, both stream identical events —
// callers should subscribe to ONE, not both, or they'll get duplicates.
//
// TODO: when raw-signal stream is needed, implement here and stop re-exporting.
import { GET as feedSseGet } from "../../feed/sse/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = feedSseGet;
