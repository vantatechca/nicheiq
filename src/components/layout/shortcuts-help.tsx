"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SHORTCUTS: { keys: string[]; action: string; section: string }[] = [
  { keys: ["⌘", "K"], action: "Open command palette", section: "Global" },
  { keys: ["?"], action: "Show this help", section: "Global" },
  { keys: ["G", "D"], action: "Go to Dashboard", section: "Navigation" },
  { keys: ["G", "F"], action: "Go to Live feed", section: "Navigation" },
  { keys: ["G", "B"], action: "Go to Brain", section: "Navigation" },
  { keys: ["G", "O"], action: "Go to Opportunities", section: "Navigation" },
  { keys: ["G", "P"], action: "Go to Products", section: "Navigation" },
  { keys: ["G", "C"], action: "Go to Creators", section: "Navigation" },
  { keys: ["G", "N"], action: "Go to Niches", section: "Navigation" },
  { keys: ["G", "T"], action: "Go to Trends", section: "Navigation" },
  { keys: ["G", "S"], action: "Go to Sources", section: "Navigation" },
  { keys: ["G", "R"], action: "Go to Rules", section: "Navigation" },
  { keys: ["⌘", "Enter"], action: "Send Brain message", section: "Brain" },
  { keys: ["Esc"], action: "Close any modal", section: "Global" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (isTyping) return;
        e.preventDefault();
        setOpen(true);
      }
      // G-then-letter chord navigation
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (isTyping) return;
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 1500) {
        const map: Record<string, string> = {
          d: "/dashboard",
          f: "/feed",
          b: "/brain",
          o: "/opportunities",
          p: "/products",
          c: "/creators",
          n: "/niches",
          t: "/trends",
          s: "/sources",
          r: "/rules",
        };
        const target = map[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          window.location.assign(target);
          lastG = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    (acc[s.section] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 text-[10px]">?</kbd> anywhere to
            see this list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section}</div>
              <ul className="space-y-1">
                {items.map((s) => (
                  <li key={s.action} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-xs">
                    <span className="text-slate-200">{s.action}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-right">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
