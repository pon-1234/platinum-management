"use client";

import { useState, useEffect } from "react";
import {
  BottleKeepDetail,
  CreateBottleKeepRequest,
} from "@/types/bottle-keep.types";

interface BottleKeepFormProps {
  bottleKeep?: BottleKeepDetail | null;
  customers?: Array<{ id: string; name: string; phone_number?: string }>;
  products?: Array<{
    id: number;
    name: string;
    category: string;
    price: number;
  }>;
  storageLocations?: string[];
  onSubmit: (data: CreateBottleKeepRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function BottleKeepForm({
  bottleKeep,
  customers = [],
  products = [],
  storageLocations = [],
  onSubmit,
  onCancel,
  loading = false,
}: BottleKeepFormProps) {
  const [formData, setFormData] = useState({
    customerId: "",
    productId: 0,
    openedDate: "",
    expiryDate: "",
    bottleNumber: "",
    storageLocation: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bottleKeep) {
      setFormData({
        customerId: bottleKeep.customer_id,
        productId: bottleKeep.product_id,
        openedDate: bottleKeep.opened_date,
        expiryDate: bottleKeep.expiry_date || "",
        bottleNumber: bottleKeep.bottle_number || "",
        storageLocation: bottleKeep.storage_location || "",
        notes: bottleKeep.notes || "",
      });
    } else {
      // 新規作成時のデフォルト値
      const today = new Date().toISOString().split("T")[0];
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      setFormData((prev) => ({
        ...prev,
        openedDate: today,
        expiryDate: sixMonthsLater.toISOString().split("T")[0],
      }));
    }
  }, [bottleKeep]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = "顧客を選択してください";
    }

    if (!formData.productId) {
      newErrors.productId = "商品を選択してください";
    }

    if (!formData.openedDate) {
      newErrors.openedDate = "開封日は必須です";
    }

    if (formData.expiryDate && formData.openedDate) {
      const openedDate = new Date(formData.openedDate);
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= openedDate) {
        newErrors.expiryDate = "期限日は開封日より後の日付を選択してください";
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
      const submitData: CreateBottleKeepRequest = {
        customerId: formData.customerId,
        productId: formData.productId,
        openedDate: formData.openedDate,
        expiryDate: formData.expiryDate || undefined,
        bottleNumber: formData.bottleNumber || undefined,
        storageLocation: formData.storageLocation || undefined,
        notes: formData.notes || undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error("ボトルキープ保存エラー:", error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProductChange = (productId: number) => {
    handleInputChange("productId", productId);

    // 商品が変更された場合、保管場所のデフォルト値を設定
    const selectedProduct = products.find((p) => p.id === productId);
    if (selectedProduct && !formData.storageLocation) {
      // カテゴリーベースでデフォルト保管場所を提案
      let suggestedLocation = "";
      switch (selectedProduct.category.toLowerCase()) {
        case "ウイスキー":
        case "ブランデー":
          suggestedLocation = "高級酒棚";
          break;
        case "焼酎":
          suggestedLocation = "焼酎棚";
          break;
        case "日本酒":
          suggestedLocation = "日本酒棚";
          break;
        case "ワイン":
          suggestedLocation = "ワインセラー";
          break;
        default:
          suggestedLocation = "一般棚";
      }
      handleInputChange("storageLocation", suggestedLocation);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {bottleKeep ? "ボトルキープ編集" : "ボトルキープ登録"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            ボトルキープの基本情報を入力してください。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 顧客選択 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="customerId"
              className="block text-sm font-medium text-gray-700"
            >
              顧客 <span className="text-red-500">*</span>
            </label>
            <select
              id="customerId"
              value={formData.customerId}
              onChange={(e) => handleInputChange("customerId", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.customerId ? "border-red-300" : ""
              }`}
            >
              <option value="">顧客を選択してください</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{" "}
                  {customer.phone_number && `(${customer.phone_number})`}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
            )}
          </div>

          {/* 商品選択 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="productId"
              className="block text-sm font-medium text-gray-700"
            >
              商品 <span className="text-red-500">*</span>
            </label>
            <select
              id="productId"
              value={formData.productId}
              onChange={(e) => handleProductChange(parseInt(e.target.value))}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.productId ? "border-red-300" : ""
              }`}
            >
              <option value={0}>商品を選択してください</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category}) -{" "}
                  {formatCurrency(product.price)}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
            )}

            {selectedProduct && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      カテゴリー:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">価格:</span>
                    <span className="ml-2 text-gray-900">
                      {formatCurrency(selectedProduct.price)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 開封日 */}
          <div>
            <label
              htmlFor="openedDate"
              className="block text-sm font-medium text-gray-700"
            >
              開封日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="openedDate"
              value={formData.openedDate}
              onChange={(e) => handleInputChange("openedDate", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.openedDate ? "border-red-300" : ""
              }`}
            />
            {errors.openedDate && (
              <p className="mt-1 text-sm text-red-600">{errors.openedDate}</p>
            )}
          </div>

          {/* 期限日 */}
          <div>
            <label
              htmlFor="expiryDate"
              className="block text-sm font-medium text-gray-700"
            >
              期限日
            </label>
            <input
              type="date"
              id="expiryDate"
              value={formData.expiryDate}
              onChange={(e) => handleInputChange("expiryDate", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.expiryDate ? "border-red-300" : ""
              }`}
            />
            {errors.expiryDate && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              未設定の場合、開封日から6ヶ月後が自動設定されます
            </p>
          </div>

          {/* ボトル番号 */}
          <div>
            <label
              htmlFor="bottleNumber"
              className="block text-sm font-medium text-gray-700"
            >
              ボトル番号
            </label>
            <input
              type="text"
              id="bottleNumber"
              value={formData.bottleNumber}
              onChange={(e) =>
                handleInputChange("bottleNumber", e.target.value)
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="例: BK000001"
            />
            <p className="mt-1 text-xs text-gray-500">
              未入力の場合、自動採番されます
            </p>
          </div>

          {/* 保管場所 */}
          <div>
            <label
              htmlFor="storageLocation"
              className="block text-sm font-medium text-gray-700"
            >
              保管場所
            </label>
            <input
              type="text"
              id="storageLocation"
              list="storage-locations"
              value={formData.storageLocation}
              onChange={(e) =>
                handleInputChange("storageLocation", e.target.value)
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="保管場所を入力"
            />
            <datalist id="storage-locations">
              {storageLocations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
          </div>

          {/* 備考 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              備考
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="特記事項があれば入力してください"
            />
          </div>
        </div>

        {/* 確認情報 */}
        {selectedCustomer && selectedProduct && formData.openedDate && (
          <div className="p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <div className="font-medium">登録内容の確認</div>
              <div className="mt-2 space-y-1">
                <div>顧客: {selectedCustomer.name}</div>
                <div>
                  商品: {selectedProduct.name} (
                  {formatCurrency(selectedProduct.price)})
                </div>
                <div>
                  開封日:{" "}
                  {new Date(formData.openedDate).toLocaleDateString("ja-JP")}
                </div>
                {formData.expiryDate && (
                  <div>
                    期限日:{" "}
                    {new Date(formData.expiryDate).toLocaleDateString("ja-JP")}
                  </div>
                )}
                {formData.storageLocation && (
                  <div>保管場所: {formData.storageLocation}</div>
                )}
              </div>
            </div>
          </div>
        )}

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
            ) : bottleKeep ? (
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
