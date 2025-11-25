"use client";

import { useState } from "react";
import {
  BottleKeepDetail,
  UseBottleKeepRequest,
} from "@/types/bottle-keep.types";

interface BottleKeepUsageFormProps {
  bottleKeep: BottleKeepDetail;
  visitId?: string;
  onSubmit: (data: UseBottleKeepRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function BottleKeepUsageForm({
  bottleKeep,
  visitId,
  onSubmit,
  onCancel,
  loading = false,
}: BottleKeepUsageFormProps) {
  const [formData, setFormData] = useState({
    amountUsed: 0.1, // デフォルト10%
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.amountUsed <= 0) {
      newErrors.amountUsed = "使用量は0より大きい値を入力してください";
    }

    if (formData.amountUsed > bottleKeep.remaining_amount) {
      newErrors.amountUsed = `残量不足です（残量: ${Math.round(bottleKeep.remaining_amount * 100)}%）`;
    }

    if (formData.amountUsed > 1) {
      newErrors.amountUsed = "使用量は100%以下で入力してください";
    }

    // visitIdは現在オプショナル
    // if (!visitId) {
    //   newErrors.visitId = "来店記録が必要です";
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: UseBottleKeepRequest = {
        bottleKeepId: bottleKeep.id,
        visitId,
        amountUsed: formData.amountUsed,
        notes: formData.notes || undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("ボトル使用記録エラー:", error);
      }
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePercentageChange = (percentage: number) => {
    const amount = percentage / 100;
    handleInputChange("amountUsed", amount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const currentPercentage = Math.round(formData.amountUsed * 100);
  const remainingAfterUse = bottleKeep.remaining_amount - formData.amountUsed;
  const usageValue = (bottleKeep.product?.price || 0) * formData.amountUsed;

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            ボトル使用記録
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {bottleKeep.customer?.name}様のボトルの使用量を記録します。
          </p>
        </div>

        {/* ボトル情報表示 */}
        <div className="bg-gray-50 rounded-md p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-gray-700">
                ボトル情報
              </div>
              <div className="mt-1">
                <div className="text-lg font-semibold text-gray-900">
                  {bottleKeep.product?.name}
                </div>
                <div className="text-sm text-gray-600">
                  {bottleKeep.bottle_number} | {bottleKeep.product?.category}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">
                現在の残量
              </div>
              <div className="mt-1">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(bottleKeep.remaining_amount * 100)}%
                </div>
                <div className="text-sm text-gray-600">
                  推定価値:{" "}
                  {formatCurrency(
                    (bottleKeep.product?.price || 0) *
                      bottleKeep.remaining_amount
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用量入力 */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="amountUsed"
              className="block text-sm font-medium text-gray-700"
            >
              使用量 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <input
                type="number"
                id="amountUsed"
                min="0.01"
                max="1"
                step="0.01"
                value={formData.amountUsed}
                onChange={(e) =>
                  handleInputChange(
                    "amountUsed",
                    parseFloat(e.target.value) || 0
                  )
                }
                className={`block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.amountUsed ? "border-red-300" : ""
                }`}
              />
              <span className="text-sm text-gray-500">
                = {currentPercentage}%
              </span>
            </div>
            {errors.amountUsed && (
              <p className="mt-1 text-sm text-red-600">{errors.amountUsed}</p>
            )}
          </div>

          {/* クイック選択ボタン */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              よく使用される量
            </div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 25, 30, 50].map((percentage) => (
                <button
                  key={percentage}
                  type="button"
                  onClick={() => handlePercentageChange(percentage)}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    currentPercentage === percentage
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {percentage}%
                </button>
              ))}
            </div>
          </div>

          {/* 残量バー */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              使用後の残量予測
            </div>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-blue-600 h-6 rounded-full relative transition-all duration-300"
                  style={{
                    width: `${Math.round(bottleKeep.remaining_amount * 100)}%`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    現在: {Math.round(bottleKeep.remaining_amount * 100)}%
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full relative transition-all duration-300 ${
                      remainingAfterUse > 0.5
                        ? "bg-green-500"
                        : remainingAfterUse > 0.25
                          ? "bg-yellow-500"
                          : remainingAfterUse > 0
                            ? "bg-orange-500"
                            : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.round(remainingAfterUse * 100))}%`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      使用後: {Math.max(0, Math.round(remainingAfterUse * 100))}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 使用価値表示 */}
          {formData.amountUsed > 0 && (
            <div className="p-3 bg-green-50 rounded-md">
              <div className="text-sm text-green-800">
                <div className="font-medium">
                  使用金額: {formatCurrency(usageValue)}
                </div>
                <div>
                  使用後残量: {Math.max(0, Math.round(remainingAfterUse * 100))}
                  %
                </div>
                {remainingAfterUse <= 0 && (
                  <div className="text-red-600 font-medium">
                    ⚠️ このボトルは完全に消費されます
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 備考 */}
          <div>
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
              placeholder="使用に関する特記事項があれば入力してください"
            />
          </div>
        </div>

        {/* 使用履歴（簡易表示） */}
        {bottleKeep.usage_history && bottleKeep.usage_history.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              最近の使用履歴
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <div className="space-y-2">
                {bottleKeep.usage_history.slice(0, 3).map((usage) => (
                  <div key={usage.id} className="flex justify-between text-sm">
                    <span>
                      {new Date(usage.created_at).toLocaleDateString("ja-JP")}
                    </span>
                    <span>{Math.round(usage.amount_used * 100)}% 使用</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                総使用量: {Math.round((bottleKeep.total_used || 0) * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {errors.visitId && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{errors.visitId}</p>
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
            disabled={loading || formData.amountUsed <= 0}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                記録中...
              </>
            ) : (
              "使用記録"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
