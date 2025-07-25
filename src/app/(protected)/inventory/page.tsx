"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { LoadingSpinner, EmptyState } from "@/components/common";
import {
  CubeIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  getProducts,
  getInventoryStats,
  getInventoryAlerts,
  getCategories,
} from "@/app/actions/inventory.actions";
import type {
  Product,
  InventoryStats,
  InventoryAlert,
} from "@/types/inventory.types";
import { toast } from "react-hot-toast";
import { ProductFormModal } from "./components/ProductFormModal";
import { InventoryMovementModal } from "./components/InventoryMovementModal";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadInventoryData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load all inventory data in parallel
      const [productsResult, statsResult, alertsResult, categoriesResult] =
        await Promise.all([
          getProducts({
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            searchTerm: searchTerm || undefined,
          }),
          getInventoryStats({}),
          getInventoryAlerts({}),
          getCategories({}),
        ]);

      if (productsResult.success) {
        setProducts(productsResult.data);
      }
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (alertsResult.success) {
        setAlerts(alertsResult.data);
      }
      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      }
    } catch (error) {
      toast.error("在庫データの取得に失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductForm(true);
  };

  const handleAddMovement = (product: Product) => {
    setSelectedProduct(product);
    setShowMovementForm(true);
  };

  const handleCloseModals = () => {
    setShowProductForm(false);
    setShowMovementForm(false);
    setSelectedProduct(null);
    loadInventoryData();
  };

  const lowStockAlerts = alerts.filter(
    (alert) =>
      alert.alertType === "low_stock" || alert.alertType === "out_of_stock"
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
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
        <button
          onClick={handleAddProduct}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          商品追加
        </button>
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
            placeholder="商品名または仕入先で検索..."
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        {products.length === 0 ? (
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
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
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleAddMovement(product)}
                          className="text-green-600 hover:text-green-900"
                        >
                          在庫調整
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
    </div>
  );
}
