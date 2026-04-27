// Inngest webhook handler — wired in Phase H. For now expose a clear placeholder.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: { status: "Inngest endpoint placeholder — wired in Phase H." },
  });
}

export async function POST() {
  return NextResponse.json({ data: { received: true, processed: 0 } });
}

export async function PUT() {
  return NextResponse.json({ data: { synced: true } });
}
