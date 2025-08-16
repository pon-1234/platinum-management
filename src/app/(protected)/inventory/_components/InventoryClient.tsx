"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, Pagination } from "@/components/common";
import {
  CubeIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { convertToCSV, downloadCSV } from "@/lib/utils/export";
import type {
  Product,
  InventoryStats,
  InventoryAlert,
} from "@/types/inventory.types";
import { toast } from "react-hot-toast";
import { ProductFormModal } from "../components/ProductFormModal";
import { InventoryMovementModal } from "../components/InventoryMovementModal";
import { getInventoryPageData } from "@/app/actions/inventory.actions";
import { getInventoryMovements } from "@/app/actions/inventory.actions";
import { Modal } from "@/components/ui/Modal";

interface InventoryClientProps {
  initialData: {
    products: Product[];
    stats: InventoryStats | null;
    alerts: InventoryAlert[];
    categories: string[];
    totalCount?: number;
  };
  error: string | null;
}

export function InventoryClient({ initialData, error }: InventoryClientProps) {
  const router = useRouter();
  const { values: invFilter, setPartial: setInvFilter } = useSavedFilters(
    "inventory",
    { q: "", category: "all" },
    { q: "string", category: "string" }
  );
  const [searchTerm, setSearchTerm] = useState(invFilter.q);
  const [selectedCategory, setSelectedCategory] = useState(invFilter.category);
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [stats, setStats] = useState<InventoryStats | null>(initialData.stats);
  const [alerts, setAlerts] = useState<InventoryAlert[]>(initialData.alerts);
  const [categories, setCategories] = useState<string[]>(
    initialData.categories
  );
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState<number>(
    initialData.totalCount ?? initialData.products.length
  );
  const [showHistoryFor, setShowHistoryFor] = useState<Product | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStart, setHistoryStart] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .slice(0, 10)
  );
  const [historyEnd, setHistoryEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // デバウンス処理
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedCategory = useDebounce(selectedCategory, 300);

  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const result = await getInventoryPageData({
        category: debouncedCategory !== "all" ? debouncedCategory : undefined,
        searchTerm: debouncedSearchTerm || undefined,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });

      if (result.success) {
        const { products, stats, alerts, categories, totalCount } = result.data;
        setProducts(products);
        setStats(stats);
        setAlerts(alerts);
        setCategories(categories);
        if (typeof totalCount === "number") setTotal(totalCount);
      } else {
        toast.error(`在庫データ取得エラー: ${result.error}`);
      }
    } catch {
      toast.error("在庫データの取得に失敗しました");
    } finally {
      setIsRefreshing(false);
    }
  }, [debouncedSearchTerm, debouncedCategory, page, pageSize]);

  const handleAddProduct = () => {
    router.push("/inventory/product/new");
  };

  const handleExport = () => {
    const rows = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      stock_quantity: p.stock_quantity,
      price: p.price,
      cost: p.cost,
      updated_at: p.updated_at,
    }));
    const csv = convertToCSV(rows);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCSV(csv, `inventory_${ts}.csv`);
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/inventory/product/${product.id}/edit`);
  };

  const handleAddMovement = (product: Product) => {
    router.push(`/inventory/product/${product.id}/movement`);
  };

  const handleOpenHistory = async (product: Product) => {
    setShowHistoryFor(product);
    setHistoryLoading(true);
    try {
      const res = await getInventoryMovements({
        productId: product.id,
        startDate: `${historyStart}T00:00:00.000Z`,
        endDate: `${historyEnd}T23:59:59.999Z`,
        offset: (historyPage - 1) * historyPageSize,
        limit: historyPageSize,
      });
      if (res.success) setHistoryItems(res.data || []);
      else setHistoryItems([]);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseModals = () => {
    setShowProductForm(false);
    setShowMovementForm(false);
    setSelectedProduct(null);
    refreshData();
  };

  // デバウンスされた値が変更されたときにデータを更新
  useEffect(() => {
    // 保存フィルタへ反映
    setInvFilter({ q: searchTerm, category: selectedCategory });
    refreshData();
  }, [refreshData]);

  const lowStockAlerts = alerts.filter(
    (alert) =>
      alert.alertType === "low_stock" || alert.alertType === "out_of_stock"
  );

  // フィルタリングはサーバー側で行われるため、クライアント側では不要
  const filteredProducts = products;

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
          <p className="text-gray-600">店舗の在庫状況を管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="border px-3 py-2 rounded-md text-sm hover:bg-gray-50"
          >
            CSVエクスポート
          </button>
          <button
            onClick={handleAddProduct}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            商品追加
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockAlerts.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">在庫不足アラート</h3>
              <p className="text-yellow-700">
                {lowStockAlerts.length}個の商品が在庫不足または在庫切れです
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総アイテム数</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalProducts || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">在庫総額</p>
              <p className="text-2xl font-bold text-gray-900">
                ¥{(stats?.totalValue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">在庫不足</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.lowStockItems || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">在庫切れ</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.outOfStockItems || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="商品名で検索..."
            disabled={isRefreshing}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isRefreshing}
          >
            <option value="all">全カテゴリー</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card>
        <div className="p-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
        {isRefreshing ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="在庫アイテムが見つかりません"
            description="検索条件を変更するか、新しい在庫アイテムを追加してください。"
            icon={<CubeIcon className="h-12 w-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={() => {
                        if (selectedIds.length === filteredProducts.length)
                          setSelectedIds([]);
                        else setSelectedIds(filteredProducts.map((p) => p.id));
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    在庫数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    原価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    販売価格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終更新
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => {
                          if (selectedIds.includes(product.id)) {
                            setSelectedIds(
                              selectedIds.filter((i) => i !== product.id)
                            );
                          } else {
                            setSelectedIds([...selectedIds, product.id]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {product.stock_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        ¥{product.cost.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        ¥{product.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {new Date(product.updated_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock_quantity === 0 ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          在庫切れ
                        </span>
                      ) : product.stock_quantity <=
                        product.low_stock_threshold ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          在庫不足
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          適正在庫
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-indigo-600 hover:text-indigo-900"
                          disabled={isRefreshing}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleAddMovement(product)}
                          className="text-green-600 hover:text-green-900"
                          disabled={isRefreshing}
                        >
                          在庫調整
                        </button>
                        <button
                          onClick={() => handleOpenHistory(product)}
                          className="text-gray-700 hover:text-gray-900"
                        >
                          履歴
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white shadow-xl border rounded-lg p-3 flex items-center gap-2">
          <span className="text-sm text-gray-700">
            選択: {selectedIds.length} 件
          </span>
          <button
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50"
            onClick={() => {
              const all = filteredProducts.filter((p) =>
                selectedIds.includes(p.id)
              );
              const rows = all.map((p) => ({
                id: p.id,
                name: p.name,
                stock: p.stock_quantity,
                category: p.category,
              }));
              const csv = convertToCSV(rows);
              const ts = new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[:T]/g, "-");
              downloadCSV(csv, `inventory_selected_${ts}.csv`);
            }}
          >
            選択をエクスポート
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50"
            onClick={() => {
              const qs = new URLSearchParams({
                ids: selectedIds.join(","),
              }).toString();
              router.push(`/inventory/bulk/movement?${qs}`);
            }}
          >
            選択を在庫調整
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-md border text-red-600 hover:bg-red-50"
            onClick={() => {
              const qs = new URLSearchParams({
                ids: selectedIds.join(","),
              }).toString();
              router.push(`/inventory/bulk/delete?${qs}`);
            }}
          >
            選択を削除
          </button>
        </div>
      )}

      {/* Modals */}
      {showProductForm && (
        <ProductFormModal
          product={selectedProduct}
          categories={categories}
          onClose={handleCloseModals}
        />
      )}

      {showMovementForm && selectedProduct && (
        <InventoryMovementModal
          product={selectedProduct}
          onClose={handleCloseModals}
        />
      )}

      {showHistoryFor && (
        <Modal
          isOpen={true}
          onClose={() => setShowHistoryFor(null)}
          title={`在庫移動履歴: ${showHistoryFor.name}`}
        >
          {historyLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              読み込み中...
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              履歴がありません
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500">開始日</label>
                  <input
                    type="date"
                    value={historyStart}
                    onChange={(e) => setHistoryStart(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">終了日</label>
                  <input
                    type="date"
                    value={historyEnd}
                    onChange={(e) => setHistoryEnd(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <button
                  className="px-3 py-1.5 text-sm border rounded"
                  onClick={() => handleOpenHistory(showHistoryFor)}
                >
                  適用
                </button>
                <button
                  className="px-3 py-1.5 text-sm border rounded"
                  onClick={async () => {
                    // CSV export of current filter
                    try {
                      const res = await getInventoryMovements({
                        productId: showHistoryFor.id,
                        startDate: `${historyStart}T00:00:00.000Z`,
                        endDate: `${historyEnd}T23:59:59.999Z`,
                        // for export, fetch larger chunk
                        offset: 0,
                        limit: 1000,
                      });
                      const rows = (res.success ? res.data : []) as any[];
                      const header = [
                        ["日時", "区分", "数量", "理由"],
                        ...rows.map((r) => [
                          new Date(r.created_at).toISOString(),
                          r.movement_type,
                          String(r.quantity),
                          r.reason || "",
                        ]),
                      ]
                        .map((cols) =>
                          cols
                            .map((c) =>
                              /[",\n]/.test(c)
                                ? `"${String(c).replace(/"/g, '""')}"`
                                : String(c)
                            )
                            .join(",")
                        )
                        .join("\n");
                      const blob = new Blob([header], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `inventory_history_${showHistoryFor.id}_${historyStart}_${historyEnd}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  CSVエクスポート
                </button>
              </div>

              <div className="max-h-[50vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">日時</th>
                      <th className="px-4 py-2 text-left">区分</th>
                      <th className="px-4 py-2 text-right">数量</th>
                      <th className="px-4 py-2 text-left">理由</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyItems.map((m, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">
                          {new Date(m.created_at).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-4 py-2">{m.movement_type}</td>
                        <td className="px-4 py-2 text-right">{m.quantity}</td>
                        <td className="px-4 py-2">{m.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-500">
                  ページ: {historyPage}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                    disabled={historyPage === 1}
                    onClick={async () => {
                      setHistoryPage((p) => Math.max(1, p - 1));
                      setHistoryLoading(true);
                      const res = await getInventoryMovements({
                        productId: showHistoryFor.id,
                        startDate: `${historyStart}T00:00:00.000Z`,
                        endDate: `${historyEnd}T23:59:59.999Z`,
                        offset: (historyPage - 2) * historyPageSize,
                        limit: historyPageSize,
                      });
                      setHistoryItems(res.success ? res.data || [] : []);
                      setHistoryLoading(false);
                    }}
                  >
                    前へ
                  </button>
                  <button
                    className="px-2 py-1 text-sm border rounded"
                    onClick={async () => {
                      setHistoryPage((p) => p + 1);
                      setHistoryLoading(true);
                      const res = await getInventoryMovements({
                        productId: showHistoryFor.id,
                        startDate: `${historyStart}T00:00:00.000Z`,
                        endDate: `${historyEnd}T23:59:59.999Z`,
                        offset: historyPage * historyPageSize,
                        limit: historyPageSize,
                      });
                      const data = res.success ? res.data || [] : [];
                      if (data.length === 0) {
                        // no more data, rollback page advance
                        setHistoryPage((p) => Math.max(1, p - 1));
                      } else {
                        setHistoryItems(data);
                      }
                      setHistoryLoading(false);
                    }}
                  >
                    次へ
                  </button>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={historyPageSize}
                    onChange={async (e) => {
                      const size = Number(e.target.value);
                      setHistoryPageSize(size);
                      setHistoryPage(1);
                      setHistoryLoading(true);
                      const res = await getInventoryMovements({
                        productId: showHistoryFor.id,
                        startDate: `${historyStart}T00:00:00.000Z`,
                        endDate: `${historyEnd}T23:59:59.999Z`,
                        offset: 0,
                        limit: size,
                      });
                      setHistoryItems(res.success ? res.data || [] : []);
                      setHistoryLoading(false);
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}/頁
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
