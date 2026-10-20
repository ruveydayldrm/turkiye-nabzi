"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay, formatScore } from "@/lib/format";
import type { TrendPoint } from "@/lib/selectors";
import { SENTIMENT_COLORS } from "@/lib/sentiment";

export interface TrendSeries {
  key: string;
  label: string;
  color?: string;
  points: TrendPoint[];
}

interface TrendChartProps {
  series: TrendSeries[];
  activeDay?: string;
  height?: number;
}

type Row = { day: string } & Record<string, number | string | null>;

export function TrendChart({ series, activeDay, height = 180 }: TrendChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const rows: Row[] = series[0].points.map((point, i) => {
    const row: Row = { day: point.day };
    for (const s of series) row[s.key] = s.points[i]?.score ?? null;
    return row;
  });

  const values = series[0].points.map((p) => p.score).filter((v): v is number => v !== null);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const zeroOffset = max === min ? 0.5 : max / (max - min);
  const single = series.length === 1;

  return (
    <div style={{ height }} className="-ml-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SENTIMENT_COLORS.positive} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={SENTIMENT_COLORS.neutral} />
              <stop offset="100%" stopColor={SENTIMENT_COLORS.negative} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
          <XAxis
            dataKey="day"
            tickFormatter={(day: string) => formatDay(day)}
            tick={{ fill: "#5d6480", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={6}
          />
          <YAxis
            domain={[-100, 100]}
            ticks={[-100, -50, 0, 50, 100]}
            tick={{ fill: "#5d6480", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <ReferenceLine y={0} stroke="rgb(255 255 255 / 0.18)" strokeDasharray="3 4" />
          {activeDay && <ReferenceLine x={activeDay} stroke="rgb(255 255 255 / 0.25)" />}
          <Tooltip
            cursor={{ stroke: "rgb(255 255 255 / 0.15)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-white/10 bg-ink-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
                  <div className="mb-1 text-subtle">{formatDay(String(label), { day: "numeric", month: "long" })}</div>
                  {payload.map((item) => (
                    <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
                      <span className="text-muted">{series.find((s) => s.key === item.dataKey)?.label}</span>
                      <span className="font-medium tabular-nums text-fg">
                        {typeof item.value === "number" ? formatScore(item.value / 100) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={single ? `url(#${gradientId})` : s.color}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: single ? "#e9ebf5" : s.color }}
              connectNulls
              animationDuration={900}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
