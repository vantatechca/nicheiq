import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div>
        <div className="text-sm font-medium text-slate-200">{title}</div>
        {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
      </div>
      {action}
    </div>
  );
}
