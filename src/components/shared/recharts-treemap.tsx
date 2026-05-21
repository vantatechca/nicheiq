"use client";

/**
 * Destination: src/components/shared/recharts-treemap.tsx  (REPLACES current)
 *
 * Fix: in recharts 2.x, the Treemap `content` renderer receives the node's data
 * fields SPREAD DIRECTLY onto its props (name, value, color, href, meta, plus the
 * computed x/y/width/height) — there is NO `payload` prop. The old CellRenderer
 * read `props.payload`, which was always undefined, so every cell returned null
 * and the treemap rendered blank. We now read the fields straight off props.
 */
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

interface Cell {
  name: string;
  value: number;
  href?: string;
  color: string;
  meta?: string;
}

interface Props {
  data: Cell[];
  height?: number;
  onClick?: (cell: Cell) => void;
}

export function RechartsTreemap({ data, height = 360, onClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data}
        dataKey="value"
        stroke="rgba(255,255,255,0.08)"
        fill="hsl(var(--primary))"
        animationDuration={400}
        content={<CellRenderer onCellClick={onClick} />}
      >
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 12,
            borderRadius: 8,
          }}
          formatter={(_v, _n, entry) => {
            // Tooltip DOES wrap the node in `.payload`; the renderer below does not.
            const p = entry as unknown as { payload?: Cell };
            const cell = p.payload;
            return [`${cell?.value ?? ""}`, cell?.meta ?? cell?.name ?? ""];
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

// recharts spreads the node data + layout onto these props directly.
interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  color?: string;
  href?: string;
  meta?: string;
  depth?: number;
  onCellClick?: (cell: Cell) => void;
}

function CellRenderer(props: CellProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    value = 0,
    color,
    href,
    meta,
    depth,
    onCellClick,
  } = props;

  // Treemap emits a root wrapper node (depth 0) covering the whole area; skip it
  // so it doesn't paint over the real cells. Also skip zero-area cells.
  if (depth === 0 || width <= 0 || height <= 0) return null;

  const cell: Cell = { name, value, color: color ?? "rgba(148,163,184,0.4)", href, meta };
  const tooSmall = width < 60 || height < 30;

  return (
    <g
      style={{ cursor: href || onCellClick ? "pointer" : "default" }}
      onClick={() => onCellClick?.(cell)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={cell.color}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />
      {!tooSmall ? (
  <>
    <clipPath id={`clip-${x}-${y}`}>
      <rect x={x} y={y} width={width} height={height} />
    </clipPath>
    <g clipPath={`url(#clip-${x}-${y})`}>
      <text x={x + 8} y={y + 18} fill="rgba(255,255,255,0.92)" fontSize={11} fontWeight={600}>
        {cell.name}
      </text>
      {height > 44 ? (
        <text x={x + 8} y={y + 32} fill="rgba(255,255,255,0.6)" fontSize={10}>
          {cell.meta}
        </text>
      ) : null}
    </g>
  </>
) : null}
    </g>
  );
}