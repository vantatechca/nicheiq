"use client";

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
          formatter={(_v, _n, payload) => {
            const p = payload as unknown as { payload: Cell };
            return [`${p.payload.value}`, p.payload.meta ?? p.payload.name];
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  color?: string;
  payload?: Cell;
  onCellClick?: (cell: Cell) => void;
}

function CellRenderer(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload, onCellClick } = props;
  const cell = payload;
  if (!cell) return null;
  const tooSmall = width < 60 || height < 30;
  return (
    <g
      style={{ cursor: cell.href || onCellClick ? "pointer" : "default" }}
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
          <text x={x + 8} y={y + 18} fill="rgba(255,255,255,0.9)" fontSize={11} fontWeight={600}>
            {cell.name}
          </text>
          <text x={x + 8} y={y + 32} fill="rgba(255,255,255,0.6)" fontSize={10}>
            {cell.meta}
          </text>
        </>
      ) : null}
    </g>
  );
}
