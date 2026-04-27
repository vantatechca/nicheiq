import { GET as feedSseGet } from "../../feed/sse/route";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const GET = feedSseGet;
