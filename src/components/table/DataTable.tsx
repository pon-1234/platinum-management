"use client";

import React, { memo, forwardRef, useMemo } from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";

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
  rowHeight = 64,
  selection,
  tableClassName,
}: DataTableProps<T>) {
  const Row = memo(({ index, style }: ListChildComponentProps) => {
    const row = rows[index] as T;
    const selected = selection?.isSelected ? selection.isSelected(row) : false;

    return (
      <tr style={style as React.CSSProperties} className="hover:bg-gray-50">
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
            className={`px-6 py-4 whitespace-nowrap ${col.className || ""}`}
          >
            {col.cell(row)}
          </td>
        ))}
      </tr>
    );
  });
  Row.displayName = "DataTableRow";

  const TBodyOuter = useMemo(
    () =>
      forwardRef<HTMLTableSectionElement, any>(function TBodyOuter(props, ref) {
        return <tbody ref={ref} {...props} />;
      }),
    []
  );

  const TBodyInner = useMemo(
    () =>
      forwardRef<HTMLTableSectionElement, any>(function TBodyInner(props, ref) {
        return <tbody ref={ref} {...props} />;
      }),
    []
  );

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="min-w-full overflow-x-auto">
        <table
          className={`min-w-full divide-y divide-gray-200 ${tableClassName || ""}`}
        >
          <thead className="bg-gray-50">
            <tr>
              {selection && (
                <th className="px-6 py-3 text-left">
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
          {rows.length === 0 ? (
            <tbody>
              <tr>
                <td
                  className="px-6 py-12 text-center text-gray-500"
                  colSpan={columns.length + (selection ? 1 : 0) || 1}
                >
                  データが見つかりません
                </td>
              </tr>
            </tbody>
          ) : (
            <FixedSizeList
              height={600}
              itemCount={rows.length}
              itemSize={rowHeight}
              width={"100%"}
              outerElementType={TBodyOuter as any}
              innerElementType={TBodyInner as any}
              itemKey={(index) => String(getRowKey(rows[index] as T))}
            >
              {Row as any}
            </FixedSizeList>
          )}
        </table>
      </div>
    </div>
  );
}
