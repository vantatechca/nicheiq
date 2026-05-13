/**
 * Debug endpoint for diagnosing Resend integration.
 * Hit https://nicheiq.onrender.com/api/_debug/email in the browser.
 * Returns JSON with env state and a live test-send result.
 *
 * Requires ?token=<DEBUG_TOKEN> to discourage random pokes.
 * Set DEBUG_TOKEN on Render to any value; pass that value in the URL.
 *
 * DELETE THIS FILE once email is confirmed working.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.DEBUG_TOKEN ?? "letmein";
  if (token !== expected) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const env = {
    RESEND_API_KEY_set: !!apiKey,
    RESEND_API_KEY_prefix: apiKey ? apiKey.slice(0, 6) : null,
    RESEND_API_KEY_length: apiKey?.length ?? 0,
    DIGEST_EMAIL_TO: process.env.DIGEST_EMAIL_TO ?? "(unset, will default to vantatechca@gmail.com)",
    DIGEST_EMAIL_FROM: process.env.DIGEST_EMAIL_FROM ?? "(unset, will default to NicheIQ <onboarding@resend.dev>)",
    NODE_VERSION: process.version,
    NODE_ENV: process.env.NODE_ENV,
  };

  if (!apiKey) {
    return NextResponse.json({ env, result: { sent: false, reason: "RESEND_API_KEY missing in env" } });
  }

  const to = (process.env.DIGEST_EMAIL_TO ?? "vantatechca@gmail.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.DIGEST_EMAIL_FROM ?? "NicheIQ <onboarding@resend.dev>";

  try {
    const client = new Resend(apiKey);
    const send = await client.emails.send({
      from,
      to,
      subject: "NicheIQ debug test — ignore",
      html: "<p>This is a debug test from <code>/api/_debug/email</code>. If you got this, Resend is working.</p>",
      text: "Debug test from /api/_debug/email. If you got this, Resend is working.",
    });

    return NextResponse.json({
      env,
      result: {
        sent: !send.error,
        id: send.data?.id ?? null,
        error: send.error ?? null,
        to,
        from,
      },
    });
  } catch (e) {
    return NextResponse.json({
      env,
      result: {
        sent: false,
        thrown: true,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack?.split("\n").slice(0, 10) : null,
      },
    });
  }
}