"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  findOpportunity,
  findProduct,
  findCreator,
  findNiche,
} from "@/mock/data";

export interface RecentItem {
  href: string;
  label: string;
  kind: "opportunity" | "product" | "creator" | "niche" | "trend";
  visitedAt: string;
}

const KEY = "nicheiq:recently-viewed";
const MAX = 10;

function readRecents(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function writeRecents(items: RecentItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}

export function pushRecent(item: RecentItem) {
  const items = readRecents().filter((x) => x.href !== item.href);
  writeRecents([item, ...items]);
}

export function getRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  return readRecents();
}

export function RecentTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const opp = pathname.match(/^\/opportunities\/(opp[a-z0-9_]+|opportunity_[a-z0-9_]+)\/?$/);
    if (opp) {
      const o = findOpportunity(opp[1] ?? "");
      if (o) pushRecent({ href: pathname, label: o.title, kind: "opportunity", visitedAt: new Date().toISOString() });
      return;
    }
    const prod = pathname.match(/^\/products\/(product_[a-z0-9_]+)\/?$/);
    if (prod) {
      const p = findProduct(prod[1] ?? "");
      if (p) pushRecent({ href: pathname, label: p.title, kind: "product", visitedAt: new Date().toISOString() });
      return;
    }
    const crt = pathname.match(/^\/creators\/(creator_[a-z0-9_]+)\/?$/);
    if (crt) {
      const c = findCreator(crt[1] ?? "");
      if (c) pushRecent({ href: pathname, label: c.displayName, kind: "creator", visitedAt: new Date().toISOString() });
      return;
    }
    const nch = pathname.match(/^\/niches\/([a-z_]+)\/?$/);
    if (nch) {
      const n = findNiche(nch[1] ?? "");
      if (n) pushRecent({ href: pathname, label: n.label, kind: "niche", visitedAt: new Date().toISOString() });
      return;
    }
    const trend = pathname.match(/^\/trends\/(.+)\/?$/);
    if (trend) {
      const decoded = decodeURIComponent(trend[1] ?? "");
      pushRecent({ href: pathname, label: decoded, kind: "trend", visitedAt: new Date().toISOString() });
    }
  }, [pathname]);
  return null;
}
