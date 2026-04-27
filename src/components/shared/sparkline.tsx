interface Props {
  data: { date: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ data, width = 120, height = 36, color = "currentColor", className }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * width;
      const y = height - ((d.value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" points={points} />
    </svg>
  );
}
