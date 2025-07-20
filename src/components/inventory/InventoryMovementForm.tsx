"use client";

import { useState } from "react";
import {
  Product,
  CreateInventoryMovementRequest,
  InventoryMovementType,
} from "@/types/inventory.types";

interface InventoryMovementFormProps {
  products: Product[];
  onSubmit: (data: CreateInventoryMovementRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  defaultProductId?: number;
  defaultMovementType?: InventoryMovementType;
}

export function InventoryMovementForm({
  products,
  onSubmit,
  onCancel,
  loading = false,
  defaultProductId,
  defaultMovementType = "in",
}: InventoryMovementFormProps) {
  const [formData, setFormData] = useState({
    productId: defaultProductId || 0,
    movementType: defaultMovementType,
    quantity: 1,
    unitCost: 0,
    reason: "",
    referenceId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProduct = products.find((p) => p.id === formData.productId);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) {
      newErrors.productId = "商品を選択してください";
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = "数量は1以上の値を入力してください";
    }

    if (formData.movementType === "out" && selectedProduct) {
      if (formData.quantity > selectedProduct.stock_quantity) {
        newErrors.quantity = `在庫不足です（現在: ${selectedProduct.stock_quantity}）`;
      }
    }

    if (formData.unitCost < 0) {
      newErrors.unitCost = "単価は0以上の値を入力してください";
    }

    if (formData.movementType === "adjustment") {
      if (!formData.reason.trim()) {
        newErrors.reason = "調整理由は必須です";
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
      const submitData: CreateInventoryMovementRequest = {
        productId: formData.productId,
        movementType: formData.movementType as InventoryMovementType,
        quantity:
          formData.movementType === "adjustment"
            ? formData.quantity // 調整の場合は新しい在庫数
            : formData.quantity, // 入庫・出庫の場合は変動数
        unitCost: formData.unitCost || undefined,
        reason: formData.reason || undefined,
        referenceId: formData.referenceId || undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error("在庫変動記録エラー:", error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "in":
        return "入庫";
      case "out":
        return "出庫";
      case "adjustment":
        return "調整";
      default:
        return type;
    }
  };

  const getQuantityLabel = () => {
    switch (formData.movementType) {
      case "in":
        return "入庫数量";
      case "out":
        return "出庫数量";
      case "adjustment":
        return "調整後在庫数";
      default:
        return "数量";
    }
  };

  const getQuantityPlaceholder = () => {
    switch (formData.movementType) {
      case "in":
        return "入庫する数量を入力";
      case "out":
        return "出庫する数量を入力";
      case "adjustment":
        return "調整後の在庫数を入力";
      default:
        return "数量を入力";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            在庫変動記録
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            商品の在庫変動を記録します。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              onChange={(e) =>
                handleInputChange("productId", parseInt(e.target.value))
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.productId ? "border-red-300" : ""
              }`}
            >
              <option value={0}>商品を選択してください</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (現在: {product.stock_quantity})
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
            )}

            {selectedProduct && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      現在の在庫:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.stock_quantity}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      カテゴリー:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      在庫少量閾値:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.low_stock_threshold}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">最大在庫:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.max_stock}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 変動タイプ */}
          <div>
            <label
              htmlFor="movementType"
              className="block text-sm font-medium text-gray-700"
            >
              変動タイプ <span className="text-red-500">*</span>
            </label>
            <select
              id="movementType"
              value={formData.movementType}
              onChange={(e) =>
                handleInputChange("movementType", e.target.value)
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="in">入庫</option>
              <option value="out">出庫</option>
              <option value="adjustment">調整</option>
            </select>
          </div>

          {/* 数量 */}
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700"
            >
              {getQuantityLabel()} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              min={formData.movementType === "adjustment" ? 0 : 1}
              value={formData.quantity}
              onChange={(e) =>
                handleInputChange("quantity", parseInt(e.target.value) || 0)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.quantity ? "border-red-300" : ""
              }`}
              placeholder={getQuantityPlaceholder()}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}

            {formData.movementType === "adjustment" && selectedProduct && (
              <p className="mt-1 text-xs text-gray-500">
                現在: {selectedProduct.stock_quantity} → 調整後:{" "}
                {formData.quantity}
                {formData.quantity !== selectedProduct.stock_quantity && (
                  <span
                    className={
                      formData.quantity > selectedProduct.stock_quantity
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {" "}
                    (
                    {formData.quantity > selectedProduct.stock_quantity
                      ? "+"
                      : ""}
                    {formData.quantity - selectedProduct.stock_quantity})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* 単価 */}
          <div>
            <label
              htmlFor="unitCost"
              className="block text-sm font-medium text-gray-700"
            >
              単価 (円)
            </label>
            <input
              type="number"
              id="unitCost"
              min="0"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) =>
                handleInputChange("unitCost", parseFloat(e.target.value) || 0)
              }
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.unitCost ? "border-red-300" : ""
              }`}
              placeholder="単価を入力（任意）"
            />
            {errors.unitCost && (
              <p className="mt-1 text-sm text-red-600">{errors.unitCost}</p>
            )}
          </div>

          {/* 参照ID */}
          <div>
            <label
              htmlFor="referenceId"
              className="block text-sm font-medium text-gray-700"
            >
              参照ID
            </label>
            <input
              type="text"
              id="referenceId"
              value={formData.referenceId}
              onChange={(e) => handleInputChange("referenceId", e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="注文ID、発注書番号など（任意）"
            />
            <p className="mt-1 text-xs text-gray-500">
              関連する注文や伝票の番号を入力できます
            </p>
          </div>

          {/* 理由・備考 */}
          <div className="sm:col-span-2">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700"
            >
              理由・備考{" "}
              {formData.movementType === "adjustment" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <textarea
              id="reason"
              rows={3}
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.reason ? "border-red-300" : ""
              }`}
              placeholder={
                formData.movementType === "adjustment"
                  ? "調整理由を入力してください"
                  : "理由や備考を入力してください（任意）"
              }
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>
        </div>

        {/* 確認メッセージ */}
        {selectedProduct && formData.quantity > 0 && (
          <div className="p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <div className="font-medium">変動内容の確認</div>
              <div className="mt-1">
                商品: {selectedProduct.name} (
                {getMovementTypeLabel(formData.movementType)})
              </div>
              <div>
                数量: {formData.quantity}
                {formData.unitCost > 0 &&
                  ` × ${formData.unitCost}円 = ${(formData.quantity * formData.unitCost).toLocaleString()}円`}
              </div>
              {formData.movementType !== "adjustment" && (
                <div>
                  在庫変動後: {selectedProduct.stock_quantity}
                  {formData.movementType === "in" ? " + " : " - "}
                  {formData.quantity} =
                  {formData.movementType === "in"
                    ? selectedProduct.stock_quantity + formData.quantity
                    : selectedProduct.stock_quantity - formData.quantity}
                </div>
              )}
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
                記録中...
              </>
            ) : (
              "記録"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
