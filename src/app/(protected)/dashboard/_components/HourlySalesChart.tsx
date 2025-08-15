"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type HourPoint = { hour: number; sales: number };

export type HourlySalesChartProps = {
  /** 例: [{ hour: "03:00", sales: 12000 }, { hour: 4, sales: 8000 }] */
  data?: Array<{ hour?: number | string; sales?: number }>;
  isLoading?: boolean;
  onRangeChange?: (range: "today" | "yesterday" | "7d") => void;
};

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  currencyDisplay: "narrowSymbol",
});

function toHour(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n))
    return Math.max(0, Math.min(23, Math.floor(n)));
  if (typeof n === "string") {
    const m = n.match(/\d{1,2}/);
    if (m) {
      const v = parseInt(m[0]!, 10);
      if (!Number.isNaN(v) && v >= 0 && v <= 23) return v;
    }
  }
  return null;
}

function build24h(
  base?: Array<{ hour?: number | string; sales?: number }>
): HourPoint[] {
  const map = new Map<number, number>();
  (base ?? []).forEach((d) => {
    const h = toHour(d.hour);
    const s = typeof d.sales === "number" ? d.sales : 0;
    if (h !== null) map.set(h, (map.get(h) ?? 0) + s);
  });
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sales: map.get(h) ?? 0,
  }));
}

export default function HourlySalesChart({
  data,
  isLoading,
  onRangeChange,
}: HourlySalesChartProps) {
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<"today" | "yesterday" | "7d">("today");

  // SSR→CSR直後の幅0対策（マウント後に描画）
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onRangeChange?.(range);
  }, [range, onRangeChange]);

  const series = useMemo(() => build24h(data), [data]);
  const total = useMemo(
    () => series.reduce((s, d) => s + d.sales, 0),
    [series]
  );
  const peak = useMemo(
    () =>
      series.reduce((max, d) => (d.sales > max.sales ? d : max), {
        hour: 0,
        sales: 0,
      }),
    [series]
  );
  const hasData = total > 0;

  return (
    <section
      aria-label="時間帯別売上"
      className="bg-white shadow rounded-lg p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">時間帯別売上</h3>
        <div
          role="tablist"
          aria-label="表示期間"
          className="inline-flex rounded-md shadow-sm ring-1 ring-gray-300"
        >
          {[
            { k: "today", label: "今日" },
            { k: "yesterday", label: "昨日" },
            { k: "7d", label: "直近7日平均" },
          ].map(({ k, label }) => (
            <button
              key={k}
              role="tab"
              aria-selected={range === (k as any)}
              onClick={() => setRange(k as "today" | "yesterday" | "7d")}
              className={`px-3 py-1.5 text-sm ${
                range === k
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* KPI チップ */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-xs text-gray-500">合計</div>
          <div className="text-base font-semibold">{yen.format(total)}</div>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-xs text-gray-500">ピーク時間</div>
          <div className="text-base font-semibold">
            {peak.sales > 0
              ? `${String(peak.hour).padStart(2, "0")}:00（${yen.format(peak.sales)}）`
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 h-[280px] w-full min-w-0">
        {!mounted || isLoading ? (
          <div
            className="h-full w-full animate-pulse rounded-md bg-gray-100"
            aria-hidden
          />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                interval={2}
                tickFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
              />
              <YAxis
                width={40}
                tickFormatter={(v) =>
                  v >= 10000
                    ? `${Math.round((v as number) / 1000)}k`
                    : String(v)
                }
              />
              <Tooltip
                formatter={(v: unknown) => [
                  yen.format(typeof v === "number" ? v : 0),
                  "売上",
                ]}
                labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
              />
              <Bar dataKey="sales" name="売上" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              この期間にデータがありません
            </p>
            <p className="mt-1 text-xs text-gray-500">
              日付範囲を変更するか、「直近7日平均」に切り替えてください。
            </p>
          </div>
        )}
      </div>

      <p className="sr-only">
        合計 {yen.format(total)}、ピークは{" "}
        {peak.sales > 0
          ? `${String(peak.hour).padStart(2, "0")}:00 に ${yen.format(peak.sales)}`
          : "データなし"}
      </p>
    </section>
  );
}
