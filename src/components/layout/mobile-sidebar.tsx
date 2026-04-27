"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS, NAV_GROUPS, APP_NAME } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = (Object.keys(NAV_GROUPS) as (keyof typeof NAV_GROUPS)[]).map((g) => ({
    group: g,
    label: NAV_GROUPS[g],
    items: NAV_ITEMS.filter((i) => i.group === g),
  }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-slate-800 bg-slate-950 p-0">
        <SheetHeader className="border-b border-slate-800 p-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            {APP_NAME}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 p-2">
          {groups.map(({ group, label, items }) => (
            <div key={group}>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                          active ? "bg-primary/10 text-primary" : "text-slate-300 hover:bg-slate-900",
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
      </SheetContent>
    </Sheet>
  );
}
