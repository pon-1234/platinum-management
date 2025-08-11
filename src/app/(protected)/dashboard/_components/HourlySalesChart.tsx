"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HourlySale {
  hour: string;
  total_sales: number;
}

interface HourlySalesChartProps {
  salesData: HourlySale[];
}

import { useMemo, useCallback } from "react";

export function HourlySalesChart({ salesData }: HourlySalesChartProps) {
  const formatCurrency = useCallback(
    (value: number) => `¥${value.toLocaleString()}`,
    []
  );
  const data = useMemo(() => salesData, [salesData]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-5">
        <h3 className="text-lg font-medium text-gray-900">時間帯別売上</h3>
        <div className="mt-4" style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="total_sales" fill="#8884d8" name="売上" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
