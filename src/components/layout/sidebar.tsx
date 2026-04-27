"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS, APP_NAME, APP_TAGLINE } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const groups = (Object.keys(NAV_GROUPS) as (keyof typeof NAV_GROUPS)[]).map((g) => ({
    group: g,
    label: NAV_GROUPS[g],
    items: NAV_ITEMS.filter((i) => i.group === g),
  }));

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none tracking-tight">{APP_NAME}</span>
          <span className="text-[10px] leading-tight text-slate-500">{APP_TAGLINE}</span>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-4">
          {groups.map(({ group, label, items }) => (
            <div key={group}>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t border-slate-800 p-3 text-[11px] text-slate-500">
        <div className="font-medium text-slate-400">Live mode</div>
<div>Drizzle/Neon connected</div>
      </div>
    </aside>
  );
}
