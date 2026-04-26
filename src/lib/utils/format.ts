import { formatDistanceToNow, format as fmt } from "date-fns";

export function formatUsd(value: number | null | undefined, opts?: { compact?: boolean }) {
  if (value == null) return "—";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 0,
  });
  return formatter.format(value);
}

export function formatRange(low?: number | null, high?: number | null) {
  if (low == null && high == null) return "—";
  if (low != null && high != null) {
    if (low === high) return formatUsd(low, { compact: true });
    return `${formatUsd(low, { compact: true })} – ${formatUsd(high, { compact: true })}`;
  }
  return formatUsd(low ?? high ?? 0, { compact: true });
}

export function formatNumber(value: number | null | undefined, opts?: { compact?: boolean }) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPct(value: number | null | undefined, opts?: { signed?: boolean }) {
  if (value == null) return "—";
  const sign = opts?.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function timeAgo(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string | null | undefined, pattern = "MMM d, yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return fmt(d, pattern);
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
