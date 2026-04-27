"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: readonly Option[];
  value: string | null;
  onChange: (v: string | null) => void;
  emptyLabel?: string;
}

export function FilterChips({ options, value, onChange, emptyLabel = "All" }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-md border px-2 py-1 text-xs transition",
          value === null
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-slate-800 text-slate-400 hover:border-slate-700",
        )}
      >
        {emptyLabel}
      </button>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-slate-800 text-slate-400 hover:border-slate-700",
            )}
          >
            {opt.label}
          </button>
        );
      })}
      {value ? (
        <Badge variant="outline" className="ml-1 gap-1 text-[10px]">
          filtered <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(null)} />
        </Badge>
      ) : null}
    </div>
  );
}
