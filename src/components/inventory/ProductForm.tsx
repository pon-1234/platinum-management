"use client";

import { useState, useEffect } from "react";
import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "@/types/inventory.types";

interface ProductFormProps {
  product?: Product | null;
  categories?: string[];
  onSubmit: (data: CreateProductData | UpdateProductData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductForm({
  product,
  categories = [],
  onSubmit,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: 0,
    cost: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    reorder_point: 10,
    max_stock: 100,
    supplier_info: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        reorder_point: product.reorder_point,
        max_stock: product.max_stock,
        supplier_info: product.supplier_info
          ? JSON.stringify(product.supplier_info)
          : "",
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "商品名は必須です";
    }

    if (!formData.category.trim()) {
      newErrors.category = "カテゴリーは必須です";
    }

    if (formData.price <= 0) {
      newErrors.price = "販売価格は0より大きい値を入力してください";
    }

    if (formData.cost < 0) {
      newErrors.cost = "原価は0以上の値を入力してください";
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = "在庫数は0以上の値を入力してください";
    }

    if (formData.low_stock_threshold < 0) {
      newErrors.low_stock_threshold =
        "在庫少量閾値は0以上の値を入力してください";
    }

    if (formData.reorder_point < 0) {
      newErrors.reorder_point = "発注点は0以上の値を入力してください";
    }

    if (formData.max_stock <= 0) {
      newErrors.max_stock = "最大在庫数は0より大きい値を入力してください";
    }

    if (formData.max_stock <= formData.low_stock_threshold) {
      newErrors.max_stock = "最大在庫数は在庫少量閾値より大きくしてください";
    }

    if (formData.supplier_info && formData.supplier_info.trim()) {
      try {
        JSON.parse(formData.supplier_info);
      } catch {
        newErrors.supplier_info =
          "仕入先情報は有効なJSON形式で入力してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateProductData | UpdateProductData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: formData.price,
        cost: formData.cost,
        stock_quantity: formData.stock_quantity,
        low_stock_threshold: formData.low_stock_threshold,
        reorder_point: formData.reorder_point,
        max_stock: formData.max_stock,
        supplier_info: formData.supplier_info
          ? JSON.parse(formData.supplier_info)
          : null,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error("商品保存エラー:", error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {product ? "商品編集" : "商品登録"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            商品の基本情報と在庫設定を入力してください。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 商品名 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.name ? "border-red-300" : ""
              }`}
              placeholder="商品名を入力"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* カテゴリー */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              カテゴリー <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="category"
              list="categories"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.category ? "border-red-300" : ""
              }`}
              placeholder="カテゴリーを入力"
            />
            <datalist id="categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* 在庫数 */}
          <div>
            <label
              htmlFor="stock_quantity"
              className="block text-sm font-medium text-gray-700"
            >
              現在の在庫数
            </label>
            <input
              type="number"
              id="stock_quantity"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) =>
                handleInputChange(
                  "stock_quantity",
                  parseInt(e.target.value) || 0
                )
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.stock_quantity ? "border-red-300" : ""
              }`}
            />
            {errors.stock_quantity && (
              <p className="mt-1 text-sm text-red-600">
                {errors.stock_quantity}
              </p>
            )}
          </div>

          {/* 販売価格 */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              販売価格 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="price"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                handleInputChange("price", parseFloat(e.target.value) || 0)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.price ? "border-red-300" : ""
              }`}
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          {/* 原価 */}
          <div>
            <label
              htmlFor="cost"
              className="block text-sm font-medium text-gray-700"
            >
              原価
            </label>
            <input
              type="number"
              id="cost"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) =>
                handleInputChange("cost", parseFloat(e.target.value) || 0)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.cost ? "border-red-300" : ""
              }`}
            />
            {errors.cost && (
              <p className="mt-1 text-sm text-red-600">{errors.cost}</p>
            )}
          </div>

          {/* 在庫少量閾値 */}
          <div>
            <label
              htmlFor="low_stock_threshold"
              className="block text-sm font-medium text-gray-700"
            >
              在庫少量閾値
            </label>
            <input
              type="number"
              id="low_stock_threshold"
              min="0"
              value={formData.low_stock_threshold}
              onChange={(e) =>
                handleInputChange(
                  "low_stock_threshold",
                  parseInt(e.target.value) || 0
                )
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.low_stock_threshold ? "border-red-300" : ""
              }`}
            />
            {errors.low_stock_threshold && (
              <p className="mt-1 text-sm text-red-600">
                {errors.low_stock_threshold}
              </p>
            )}
          </div>

          {/* 発注点 */}
          <div>
            <label
              htmlFor="reorder_point"
              className="block text-sm font-medium text-gray-700"
            >
              発注点
            </label>
            <input
              type="number"
              id="reorder_point"
              min="0"
              value={formData.reorder_point}
              onChange={(e) =>
                handleInputChange(
                  "reorder_point",
                  parseInt(e.target.value) || 0
                )
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.reorder_point ? "border-red-300" : ""
              }`}
            />
            {errors.reorder_point && (
              <p className="mt-1 text-sm text-red-600">
                {errors.reorder_point}
              </p>
            )}
          </div>

          {/* 最大在庫数 */}
          <div>
            <label
              htmlFor="max_stock"
              className="block text-sm font-medium text-gray-700"
            >
              最大在庫数
            </label>
            <input
              type="number"
              id="max_stock"
              min="1"
              value={formData.max_stock}
              onChange={(e) =>
                handleInputChange("max_stock", parseInt(e.target.value) || 0)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.max_stock ? "border-red-300" : ""
              }`}
            />
            {errors.max_stock && (
              <p className="mt-1 text-sm text-red-600">{errors.max_stock}</p>
            )}
          </div>

          {/* 仕入先情報 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="supplier_info"
              className="block text-sm font-medium text-gray-700"
            >
              仕入先情報 (JSON形式)
            </label>
            <textarea
              id="supplier_info"
              rows={3}
              value={formData.supplier_info}
              onChange={(e) =>
                handleInputChange("supplier_info", e.target.value)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.supplier_info ? "border-red-300" : ""
              }`}
              placeholder='例: {"name": "仕入先名", "contact": "連絡先", "notes": "備考"}'
            />
            {errors.supplier_info && (
              <p className="mt-1 text-sm text-red-600">
                {errors.supplier_info}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              仕入先の情報をJSON形式で入力してください（任意）
            </p>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : product ? (
              "更新"
            ) : (
              "登録"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
