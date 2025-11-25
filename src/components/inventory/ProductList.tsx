"use client";

import { useMemo, useState, memo, type CSSProperties } from "react";
import { Product, InventorySearchFilter } from "@/types/inventory.types";
import { SelectionPanel } from "@/components/table/SelectionPanel";
import { convertToCSV, downloadCSV } from "@/lib/utils/export";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DataTable, DataTableColumn } from "@/components/table/DataTable";

interface ProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onView?: (product: Product) => void;
  onFilterChange?: (filter: InventorySearchFilter) => void;
  categories?: string[];
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  onView,
  onFilterChange,
  categories = [],
}: ProductListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<InventorySearchFilter>({
    searchTerm: "",
    category: "",
    sortBy: "name",
    sortOrder: "asc",
  });

  const handleFilterChange = (newFilter: Partial<InventorySearchFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    onFilterChange?.(updatedFilter);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP");
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: "在庫切れ", color: "text-red-600 bg-red-100" };
    } else if (product.stock_quantity <= product.low_stock_threshold) {
      return { label: "在庫少量", color: "text-yellow-600 bg-yellow-100" };
    } else if (product.stock_quantity >= product.max_stock) {
      return { label: "在庫過多", color: "text-blue-600 bg-blue-100" };
    } else {
      return { label: "正常", color: "text-green-600 bg-green-100" };
    }
  };

  const rows = useMemo(() => products, [products]);

  // Virtualized table row as TR
  const Row = memo(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const product = rows[index];
      const stockStatus = getStockStatus(product);
      const isSelected = selectedIds.includes(product.id);
      return (
        <tr style={style as React.CSSProperties} className="hover:bg-gray-50">
          <td className="px-6 py-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(product.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {product.name}
                </div>
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {product.category}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}
              >
                {stockStatus.label}
              </span>
              {(product.stock_quantity === 0 ||
                product.stock_quantity <= product.low_stock_threshold) && (
                <ExclamationTriangleIcon className="ml-2 h-4 w-4 text-yellow-400" />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {product.stock_quantity} / {product.max_stock}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {formatCurrency(product.price)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {formatCurrency(product.cost)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatDate(product.updated_at)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex space-x-2">
              {onView && (
                <button
                  onClick={() => onView(product)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(product)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(product)}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }
  );
  Row.displayName = "Row";

  return (
    <div className="space-y-4">
      {/* フィルター・検索 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              商品名検索
            </label>
            <input
              type="text"
              id="search"
              placeholder="商品名を入力..."
              value={filter.searchTerm}
              onChange={(e) =>
                handleFilterChange({ searchTerm: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              カテゴリー
            </label>
            <select
              id="category"
              value={filter.category}
              onChange={(e) => handleFilterChange({ category: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">すべて</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-gray-700"
            >
              並び順
            </label>
            <select
              id="sortBy"
              value={filter.sortBy}
              onChange={(e) =>
                handleFilterChange({
                  sortBy: e.target.value as "name" | "stock" | "lastUpdated",
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="name">商品名</option>
              <option value="stock">在庫数</option>
              <option value="lastUpdated">更新日時</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={() =>
                handleFilterChange({ isLowStock: !filter.isLowStock })
              }
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter.isLowStock
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              在庫少量のみ
            </button>
            <button
              onClick={() =>
                handleFilterChange({ isOutOfStock: !filter.isOutOfStock })
              }
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter.isOutOfStock
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              在庫切れのみ
            </button>
          </div>
        </div>
      </div>

      {/* 商品一覧テーブル（共通 DataTable） */}
      <DataTable
        columns={
          [
            {
              key: "name",
              header: "商品名",
              cell: (p: Product) => (
                <div className="font-medium text-gray-900">{p.name}</div>
              ),
            },
            {
              key: "category",
              header: "カテゴリー",
              cell: (p: Product) => (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {p.category}
                </span>
              ),
            },
            {
              key: "stock",
              header: "在庫数",
              cell: (p: Product) => <span>{p.stock_quantity}</span>,
            },
            {
              key: "cost",
              header: "原価",
              cell: (p: Product) => <span>¥{p.cost.toLocaleString()}</span>,
            },
            {
              key: "price",
              header: "販売価格",
              cell: (p: Product) => <span>¥{p.price.toLocaleString()}</span>,
            },
            {
              key: "updated",
              header: "更新日",
              cell: (p: Product) => (
                <span>
                  {new Date(p.updated_at).toLocaleDateString("ja-JP")}
                </span>
              ),
            },
            {
              key: "actions",
              header: "操作",
              cell: (p: Product) => (
                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={() => onEdit?.(p)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onView?.(p)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => onDelete?.(p)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </div>
              ),
              className: "text-right",
            },
          ] as DataTableColumn<Product>[]
        }
        rows={products}
        getRowKey={(p) => p.id}
        selection={{
          isAllSelected:
            selectedIds.length === products.length && products.length > 0,
          isSelected: (p) => selectedIds.includes(p.id),
          onToggleAll: handleSelectAll,
          onToggleOne: (p) => handleSelectOne(p.id),
        }}
      />

      <SelectionPanel
        selectedCount={selectedIds.length}
        actions={[
          {
            label: "選択をエクスポート",
            onClick: () => {
              const all = products.filter((p) => selectedIds.includes(p.id));
              const rows = all.map((p) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                cost: p.cost,
                stock_quantity: p.stock_quantity,
                low_stock_threshold: p.low_stock_threshold,
                reorder_point: p.reorder_point,
                max_stock: p.max_stock,
                is_active: p.is_active,
                updated_at: p.updated_at,
              }));
              const csv = convertToCSV(rows);
              const ts = new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[:T]/g, "-");
              downloadCSV(csv, `products_selected_${ts}.csv`);
            },
          },
          {
            label: "在庫調整 (選択)",
            onClick: () => {
              const ids = selectedIds.join(",");
              router.push(`/inventory/bulk/movement?ids=${ids}`);
            },
            variant: "default",
          },
          {
            label: "選択を削除",
            onClick: () => {
              const ids = selectedIds.join(",");
              router.push(`/inventory/bulk/delete?ids=${ids}`);
            },
            variant: "default",
          },
        ]}
      />
    </div>
  );
}
