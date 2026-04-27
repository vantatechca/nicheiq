import { NextResponse } from "next/server";
import { z } from "zod";

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta }, { status: 200 });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ data: null, error, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
}

export function notFound(error = "Not found") {
  return NextResponse.json({ data: null, error }, { status: 404 });
}

export function serverError(error: string) {
  return NextResponse.json({ data: null, error }, { status: 500 });
}

export async function parseJson<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  const raw = await request.json();
  return schema.parse(raw);
}

export function paginate<T>(items: T[], cursor?: string, limit = 25) {
  const start = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const slice = items.slice(start, start + limit);
  const next = start + slice.length < items.length ? String(start + slice.length) : null;
  return { items: slice, nextCursor: next, total: items.length };
}
