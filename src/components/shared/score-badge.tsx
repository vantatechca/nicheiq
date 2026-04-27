import { Badge } from "@/components/ui/badge";
import { bucketForScore } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function ScoreBadge({ score, size = "md", className, showLabel = true }: Props) {
  const bucket = bucketForScore(score);
  const sizeCls = size === "sm" ? "text-xs px-1.5 py-0.5" : size === "lg" ? "text-base px-2.5 py-1" : "text-xs px-2 py-0.5";
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-transparent font-mono",
        bucket?.color === "emerald" && "bg-emerald-500/15 text-emerald-300",
        bucket?.color === "sky" && "bg-sky-500/15 text-sky-300",
        bucket?.color === "amber" && "bg-amber-500/15 text-amber-300",
        bucket?.color === "orange" && "bg-orange-500/15 text-orange-300",
        bucket?.color === "rose" && "bg-rose-500/15 text-rose-300",
        sizeCls,
        className,
      )}
    >
      <span className="font-semibold">{score}</span>
      {showLabel ? <span className="text-[10px] opacity-80">{bucket?.label}</span> : null}
    </Badge>
  );
}
