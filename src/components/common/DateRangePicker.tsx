"use client";

import React from "react";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange?: (start?: string, end?: string) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      <input
        type="date"
        className="border rounded px-2 py-1 text-xs"
        value={startDate ?? ""}
        onChange={(e) => onChange?.(e.target.value || undefined, endDate)}
      />
      <span className="text-gray-400">〜</span>
      <input
        type="date"
        className="border rounded px-2 py-1 text-xs"
        value={endDate ?? ""}
        onChange={(e) => onChange?.(startDate, e.target.value || undefined)}
      />
    </div>
  );
}
