import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    data: {
      status: "ok",
      version: "0.1.0",
      mode: process.env.USE_MOCK === "false" ? "live" : "mock",
      timestamp: new Date().toISOString(),
    },
  });
}
