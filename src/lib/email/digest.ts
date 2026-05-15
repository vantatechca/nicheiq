/**
 * Digest email helpers.
 *
 * `buildDigestEmail` renders an HTML + plain-text version of a daily/weekly
 * digest. `sendDigestEmail` sends it via Resend if `RESEND_API_KEY` is set,
 * otherwise it no-ops so local/mock environments keep working.
 *
 * Env:
 *   RESEND_API_KEY      required to actually send
 *   DIGEST_EMAIL_TO     comma-separated recipients (default: vantatechca@gmail.com)
 *   DIGEST_EMAIL_FROM   from address (default: "NicheIQ <onboarding@resend.dev>")
 *   NEXTAUTH_URL        used to build the dashboard CTA link
 */

import { Resend } from "resend";

type TopProduct = { id: string; title: string; revenue: number };

export interface DigestEmailInput {
  cadence: "daily" | "weekly" | "monthly" | "on_demand";
  aiSummary: string;
  topProducts: TopProduct[];
  risingNiches: string[];
  periodStart: Date;
  periodEnd: Date;
  appUrl?: string;
}

export interface DigestEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendDigestResult {
  sent: boolean;
  to: string[];
  id?: string;
  skipped?: "no_api_key" | "no_recipients";
  error?: string;
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CADENCE_LABEL: Record<DigestEmailInput["cadence"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  on_demand: "On-demand",
};

export function buildDigestEmail(input: DigestEmailInput): DigestEmailContent {
  const { cadence, aiSummary, topProducts, risingNiches, periodEnd } = input;

  const cadenceLabel = CADENCE_LABEL[cadence] ?? "Digest";
  const dateStr = periodEnd.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `NicheIQ ${cadenceLabel} — ${dateStr}`;

  const base = (input.appUrl ?? process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const digestLink = base ? `${base}/digest` : "";

  const productRowsHtml = topProducts.length
    ? topProducts
        .map(
          (p) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;">${escapeHtml(p.title)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px;text-align:right;white-space:nowrap;">${fmtMoney(p.revenue)}/mo</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px 0;color:#94a3b8;font-size:14px;">No opportunities scored this period yet.</td></tr>`;

  const nichesHtml = risingNiches.length
    ? risingNiches
        .slice(0, 8)
        .map(
          (n) =>
            `<span style="display:inline-block;padding:4px 10px;margin:0 6px 6px 0;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;font-size:12px;color:#334155;">${escapeHtml(titleCase(n))}</span>`,
        )
        .join("")
    : `<span style="color:#94a3b8;font-size:13px;">No rising niches yet.</span>`;

  const ctaHtml = digestLink
    ? `<div style="margin-top:8px;"><a href="${digestLink}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">Open dashboard →</a></div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;">
          <div style="font-size:12px;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">NicheIQ · ${escapeHtml(cadenceLabel)} Digest</div>
          <div style="font-size:14px;color:#334155;margin-top:4px;">${escapeHtml(dateStr)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <h2 style="margin:0 0 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;font-weight:600;">Summary</h2>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;">${escapeHtml(aiSummary)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 8px;">
          <h2 style="margin:0 0 12px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;font-weight:600;">Top opportunities</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${productRowsHtml}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;">
          <h2 style="margin:0 0 12px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;font-weight:600;">Rising niches</h2>
          ${nichesHtml}
        </td>
      </tr>
      ${ctaHtml ? `<tr><td style="padding:0 28px 28px;">${ctaHtml}</td></tr>` : ""}
    </table>
    <div style="font-size:11px;color:#94a3b8;margin-top:16px;">Sent by NicheIQ · Configure recipient via DIGEST_EMAIL_TO</div>
  </td></tr>
</table>
</body>
</html>`;

  const textLines: string[] = [
    `NicheIQ ${cadenceLabel} Digest — ${dateStr}`,
    "",
    "SUMMARY",
    aiSummary || "(no summary)",
    "",
    "TOP OPPORTUNITIES",
    ...(topProducts.length
      ? topProducts.map((p) => `  • ${p.title} — ${fmtMoney(p.revenue)}/mo`)
      : ["  (none scored this period)"]),
    "",
    "RISING NICHES",
    risingNiches.length ? `  ${risingNiches.slice(0, 8).map(titleCase).join(", ")}` : "  (none)",
  ];
  if (digestLink) {
    textLines.push("", `Open dashboard: ${digestLink}`);
  }

  return { subject, html, text: textLines.join("\n") };
}

export async function sendDigestEmail(input: DigestEmailInput): Promise<SendDigestResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[digest-email] RESEND_API_KEY not set — skipping send");
    return { sent: false, to: [], skipped: "no_api_key" };
  }

  const recipients = (process.env.DIGEST_EMAIL_TO ?? "vantatechca@gmail.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length) {
    console.warn("[digest-email] DIGEST_EMAIL_TO produced no recipients — skipping");
    return { sent: false, to: [], skipped: "no_recipients" };
  }

  const from = process.env.DIGEST_EMAIL_FROM ?? "NicheIQ <onboarding@resend.dev>";
  const { subject, html, text } = buildDigestEmail(input);

  console.log(
    `[digest-email] sending cadence=${input.cadence} to=${recipients.join(",")} from="${from}" keyPrefix=${apiKey.slice(0, 6)}`,
  );

  try {
    const client = new Resend(apiKey);
    const { data, error } = await client.emails.send({
      from,
      to: recipients,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[digest-email] Resend SDK returned error:", error);
      return {
        sent: false,
        to: recipients,
        error: error.message ?? "resend_error",
      };
    }
    console.log(`[digest-email] sent OK id=${data?.id}`);
    return { sent: true, to: recipients, id: data?.id };
  } catch (e) {
    console.error("[digest-email] exception during send:", e);
    return {
      sent: false,
      to: recipients,
      error: e instanceof Error ? e.message : "unknown_error",
    };
  }
}
