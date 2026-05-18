"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
  Archive,
  CircleDashed,
  CircleDot,
  Hammer,
  Rocket,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client/fetcher";
import { PRODUCT_STATUSES } from "@/lib/utils/constants";

type Status = (typeof PRODUCT_STATUSES)[number]["value"];

interface Props {
  opportunityId: string;
  initial: Status;
  onChange?: (next: Status) => void;
  /** Render compact (badge size) for list rows; default false → full-size button. */
  compact?: boolean;
  /**
   * Statuses that should NOT auto-PATCH on click — instead they fire
   * `onIntercept` and let the parent handle the change (e.g. open a
   * launch dialog before committing to status="launched").
   */
  interceptStatuses?: Status[];
  /**
   * Called when the user picks an intercepted status. Return true if the
   * intercept handler has already persisted the change itself (the picker
   * will adopt the new value locally). Return false to abort (the picker
   * stays on its previous value).
   */
  onIntercept?: (next: Status) => Promise<boolean>;
}

// ── Visual map ──────────────────────────────────────────────────────
// PRODUCT_STATUSES carries a `color` token from the constants file. Here
// we map that to concrete Tailwind classes plus a lucide icon so the
// picker reads at a glance without bouncing back to docs.

const STATUS_META: Record<
  Status,
  { icon: LucideIcon; chip: string; dot: string; description: string }
> = {
  tracking: {
    icon: CircleDashed,
    chip: "border-slate-700 bg-slate-900/60 text-slate-300",
    dot: "bg-slate-400",
    description: "In the funnel. No commitment yet.",
  },
  shortlisted: {
    icon: CircleDot,
    chip: "border-sky-700/60 bg-sky-950/40 text-sky-200",
    dot: "bg-sky-400",
    description: "Worth a closer look. Pressure-test before building.",
  },
  building: {
    icon: Hammer,
    chip: "border-amber-700/60 bg-amber-950/40 text-amber-200",
    dot: "bg-amber-400",
    description: "Active build. Tracking deliverables and milestones.",
  },
  launched: {
    icon: Rocket,
    chip: "border-emerald-700/60 bg-emerald-950/40 text-emerald-200",
    dot: "bg-emerald-400",
    description: "Shipped. Watch revenue + reviews.",
  },
  abandoned: {
    icon: XCircle,
    chip: "border-rose-800/60 bg-rose-950/40 text-rose-200",
    dot: "bg-rose-400",
    description: "Killed. Capture the reason so the next bet learns.",
  },
  archived: {
    icon: Archive,
    chip: "border-zinc-700 bg-zinc-900/60 text-zinc-300",
    dot: "bg-zinc-400",
    description: "Out of rotation. Keep for reference.",
  },
};

// Pipeline order matches the typical workflow. Terminal states (abandoned /
// archived) live in a second group below a separator so users don't pick
// them by accident on a happy-path opportunity.
const PIPELINE: Status[] = ["tracking", "shortlisted", "building", "launched"];
const TERMINAL: Status[] = ["abandoned", "archived"];

export function StatusPicker({
  opportunityId,
  initial,
  onChange,
  compact = false,
  interceptStatuses,
  onIntercept,
}: Props) {
  const [current, setCurrent] = useState<Status>(initial);
  const [isPending, startTransition] = useTransition();

  const meta = STATUS_META[current];
  const label =
    PRODUCT_STATUSES.find((s) => s.value === current)?.label ?? current;
  const Icon = meta.icon;

  async function setStatus(next: Status) {
    if (next === current) return;
    const prev = current;

    // Intercept path: let the parent handle persistence (e.g. open the
    // Launch dialog when next === "launched" and create the product first).
    // The picker only adopts the new value if the intercept handler
    // confirms it actually went through.
    if (interceptStatuses?.includes(next) && onIntercept) {
      const accepted = await onIntercept(next);
      if (accepted) {
        setCurrent(next);
        onChange?.(next);
      }
      return;
    }

    // Optimistic update — flip the UI immediately, roll back on error.
    setCurrent(next);
    onChange?.(next);

    startTransition(async () => {
      try {
        await api.patch(`/api/opportunities/${opportunityId}`, { status: next });
        toast.success(
          `Marked as ${PRODUCT_STATUSES.find((s) => s.value === next)?.label ?? next}`,
        );
      } catch (err) {
        setCurrent(prev);
        onChange?.(prev);
        toast.error("Couldn't update status: " + (err as Error).message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={`gap-1.5 ${meta.chip} ${compact ? "h-7 px-2 text-xs" : ""}`}
          disabled={isPending}
        >
          <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          <span className="capitalize">{label}</span>
          <ChevronDown className={compact ? "h-3 w-3 opacity-60" : "h-3.5 w-3.5 opacity-60"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
          Pipeline
        </DropdownMenuLabel>
        {PIPELINE.map((s) => (
          <StatusItem
            key={s}
            value={s}
            current={current}
            onSelect={() => setStatus(s)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
          Terminal
        </DropdownMenuLabel>
        {TERMINAL.map((s) => (
          <StatusItem
            key={s}
            value={s}
            current={current}
            onSelect={() => setStatus(s)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusItem({
  value,
  current,
  onSelect,
}: {
  value: Status;
  current: Status;
  onSelect: () => void;
}) {
  const meta = STATUS_META[value];
  const Icon = meta.icon;
  const label = PRODUCT_STATUSES.find((s) => s.value === value)?.label ?? value;
  const isCurrent = value === current;
  return (
    <DropdownMenuItem onSelect={onSelect} className="flex items-start gap-2 py-2">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
          {isCurrent ? <Check className="ml-auto h-3.5 w-3.5 text-emerald-400" /> : null}
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{meta.description}</div>
      </div>
    </DropdownMenuItem>
  );
}