"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as React from "react";

type Point = { hour: string; amount: number };
type Props = { data?: Point[] };

const currency = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function HourlySalesChart({ data }: Props) {
  const series = React.useMemo(() => (data ? data : []), [data]);

  if (!series.length) {
    return (
      <div
        className="flex h-[300px] items-center justify-center text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        データがありません
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={series}
          margin={{ top: 10, right: 16, left: 0, bottom: 16 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickLine={false} axisLine={false} />
          <YAxis
            width={64}
            tickFormatter={(v) => currency.format(Number(v))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            labelFormatter={(label) => `${label} の売上`}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
