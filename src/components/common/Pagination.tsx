"use client";

import React from "react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex items-center justify-between gap-2 ${className || ""}`}
    >
      <div className="text-sm text-gray-600">
        全 {total} 件中 {startIdx}–{endIdx} を表示
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            className="border rounded px-2 py-1 text-xs"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}/頁
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 border rounded text-xs disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            前へ
          </button>
          <span className="text-xs">
            {page} / {totalPages}
          </span>
          <button
            className="px-2 py-1 border rounded text-xs disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
