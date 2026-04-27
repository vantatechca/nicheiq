"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Lightbulb,
  Package,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS, BRAIN_MODES } from "@/lib/utils/constants";
import {
  mockOpportunities,
  mockProducts,
  mockCreators,
  mockNiches,
} from "@/mock/data";

interface Result {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const opportunities: Result[] = mockOpportunities.slice(0, 60).map((o) => ({
    id: `opp-${o.id}`,
    label: o.title,
    hint: `${o.score} · ${o.niche.replace(/_/g, " ")}`,
    href: `/opportunities/${o.id}`,
    icon: Lightbulb,
  }));
  const products: Result[] = mockProducts.slice(0, 40).map((p) => ({
    id: `prd-${p.id}`,
    label: p.title,
    hint: `${p.creator} · ${p.sourcePlatform.replace(/_/g, " ")}`,
    href: `/products/${p.id}`,
    icon: Package,
  }));
  const creators: Result[] = mockCreators.slice(0, 40).map((c) => ({
    id: `crt-${c.id}`,
    label: c.displayName,
    hint: `${c.handle} · ${c.sourcePlatform.replace(/_/g, " ")}`,
    href: `/creators/${c.id}`,
    icon: Users,
  }));
  const niches: Result[] = mockNiches.map((n) => ({
    id: `nch-${n.slug}`,
    label: n.label,
    hint: `momentum ${n.momentumScore}`,
    href: `/niches/${n.slug}`,
    icon: Compass,
  }));

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-slate-400 transition hover:border-slate-700 md:flex"
      >
        <Sparkles className="h-3 w-3" /> Quick search
        <kbd className="ml-1 rounded border border-slate-700 bg-slate-800 px-1 text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search opportunities, products, creators, niches…" />
        <CommandList>
          <CommandEmpty>No matches. Try fewer keywords.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => go(item.href)}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <CommandShortcut>{item.group}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Brain modes">
            {BRAIN_MODES.map((m) => (
              <CommandItem key={m.value} onSelect={() => go(`/brain?mode=${m.value}`)}>
                <Sparkles className="h-4 w-4" />
                <span>{m.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Opportunities">
            {opportunities.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.href)}>
                <Lightbulb className="h-4 w-4" />
                <span className="line-clamp-1">{r.label}</span>
                <CommandShortcut>{r.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Products">
            {products.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.href)}>
                <Package className="h-4 w-4" />
                <span className="line-clamp-1">{r.label}</span>
                <CommandShortcut>{r.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Creators">
            {creators.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.href)}>
                <Users className="h-4 w-4" />
                <span className="line-clamp-1">{r.label}</span>
                <CommandShortcut>{r.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Niches">
            {niches.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.href)}>
                <Compass className="h-4 w-4" />
                <span>{r.label}</span>
                <CommandShortcut>{r.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
