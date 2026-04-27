"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";

interface Props {
  data: { date: string; value: number }[];
  height?: number;
  variant?: "line" | "area";
  color?: string;
}

export function RechartsLine({ data, height = 200, variant = "area", color = "hsl(var(--primary))" }: Props) {
  const formatted = data.map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }));
  const Comp = variant === "line" ? LineChart : AreaChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Comp data={formatted}>
        <defs>
          <linearGradient id="rcg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 12,
            borderRadius: 8,
          }}
        />
        {variant === "line" ? (
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ) : (
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#rcg)" />
        )}
      </Comp>
    </ResponsiveContainer>
  );
}
