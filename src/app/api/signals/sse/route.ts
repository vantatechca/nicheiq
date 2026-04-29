import { GET as feedSseGet } from "../../feed/sse/route";

export const runtime = 'nodejs'
export const dynamic = "force-dynamic";
export const GET = feedSseGet;
