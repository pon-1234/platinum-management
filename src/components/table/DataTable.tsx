"use client";

import React from "react";

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableSelection<T = any> {
  isAllSelected: boolean;
  isSelected: (row: T) => boolean;
  onToggleAll: () => void;
  onToggleOne: (row: T) => void;
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  rowHeight?: number; // default 64
  selection?: DataTableSelection<T>;
  tableClassName?: string;
}

export function DataTable<T = any>({
  columns,
  rows,
  getRowKey,
  rowHeight = 64, // reserved for future virtualization
  selection,
  tableClassName,
}: DataTableProps<T>) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className={`w-full table-fixed ${tableClassName || ""}`}>
          <colgroup>
            {selection && <col style={{ width: 56 }} />}
            {columns.map((c) => (
              <col key={c.key} />
            ))}
          </colgroup>
          <thead className="bg-gray-50">
            <tr className="divide-x divide-gray-200">
              {selection && (
                <th className="px-6 py-3 text-left align-middle">
                  <input
                    type="checkbox"
                    checked={selection.isAllSelected}
                    onChange={selection.onToggleAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-12 text-center text-gray-500"
                  colSpan={columns.length + (selection ? 1 : 0) || 1}
                >
                  データが見つかりません
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selection?.isSelected
                  ? selection.isSelected(row)
                  : false;
                return (
                  <tr key={String(getRowKey(row))} className="hover:bg-gray-50">
                    {selection && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => selection.onToggleOne(row)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-4 whitespace-nowrap ${
                          col.className || ""
                        }`}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
