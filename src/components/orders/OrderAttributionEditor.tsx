"use client";

import { useState, useEffect } from "react";
import { User, Percent, Edit2, Save, X } from "lucide-react";
import {
  VisitSessionService,
  type BillItemAttribution,
  type CastEngagement,
} from "@/services/visit-session.service";
import { formatCurrency } from "@/lib/utils/formatting";

interface OrderAttributionEditorProps {
  orderItemId: string;
  visitId: string;
  totalAmount: number;
  onAttributionChange?: () => void;
}

export default function OrderAttributionEditor({
  orderItemId,
  visitId,
  totalAmount,
  onAttributionChange,
}: OrderAttributionEditorProps) {
  const [attributions, setAttributions] = useState<BillItemAttribution[]>([]);
  const [engagements, setEngagements] = useState<CastEngagement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderItemId, visitId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // アトリビューションを取得
      const attrs = await VisitSessionService.getItemAttributions(orderItemId);
      setAttributions(attrs);

      // 訪問セッションの詳細を取得
      const session = await VisitSessionService.getSessionDetails(visitId);
      if (session?.cast_engagements) {
        setEngagements(session.cast_engagements.filter((e) => e.is_active));
      }

      // 編集値を初期化
      const values: Record<string, number> = {};
      attrs.forEach((attr) => {
        values[attr.cast_id] = attr.attribution_percentage;
      });
      setEditingValues(values);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoCalculate = async () => {
    setIsLoading(true);
    try {
      await VisitSessionService.calculateAutoAttribution(orderItemId, visitId);
      await loadData();
      onAttributionChange?.();
    } catch (error) {
      console.error("Error calculating auto attribution:", error);
      alert("自動計算に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveManualAttributions = async () => {
    setIsLoading(true);
    try {
      // 合計が100%になるか確認
      const total = Object.values(editingValues).reduce(
        (sum, val) => sum + val,
        0
      );
      if (Math.abs(total - 100) > 0.01) {
        alert(
          `合計が100%になるように調整してください（現在: ${total.toFixed(1)}%）`
        );
        return;
      }

      // 既存のアトリビューションを削除して再作成
      // （実際の実装では、更新APIを使用する方が効率的）
      for (const [castId, percentage] of Object.entries(editingValues)) {
        await VisitSessionService.addItemAttribution(
          orderItemId,
          castId,
          percentage,
          "manual",
          "手動調整"
        );
      }

      await loadData();
      setIsEditing(false);
      onAttributionChange?.();
    } catch (error) {
      console.error("Error saving manual attributions:", error);
      alert("保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getAttributionTypeLabel = (
    type: BillItemAttribution["attribution_type"]
  ) => {
    switch (type) {
      case "nomination":
        return "指名";
      case "drink_for_cast":
        return "キャストドリンク";
      case "time_share":
        return "時間按分";
      case "manual":
        return "手動";
      case "auto":
        return "自動";
      default:
        return type;
    }
  };

  const getAttributionTypeColor = (
    type: BillItemAttribution["attribution_type"]
  ) => {
    switch (type) {
      case "nomination":
        return "bg-purple-100 text-purple-700";
      case "drink_for_cast":
        return "bg-pink-100 text-pink-700";
      case "time_share":
        return "bg-blue-100 text-blue-700";
      case "manual":
        return "bg-orange-100 text-orange-700";
      case "auto":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const totalPercentage = attributions.reduce(
    (sum, attr) => sum + attr.attribution_percentage,
    0
  );

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">売上配分</h3>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleAutoCalculate}
                disabled={isLoading || engagements.length === 0}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                自動計算
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveManualAttributions}
                disabled={isLoading}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // 編集値をリセット
                  const values: Record<string, number> = {};
                  attributions.forEach((attr) => {
                    values[attr.cast_id] = attr.attribution_percentage;
                  });
                  setEditingValues(values);
                }}
                disabled={isLoading}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {attributions.length === 0 && engagements.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          キャストが割り当てられていません
        </p>
      ) : attributions.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">配分が設定されていません</p>
          <button
            onClick={handleAutoCalculate}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            自動計算を実行
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {isEditing ? (
            // 編集モード
            <>
              {engagements.map((engagement) => {
                const percentage = editingValues[engagement.cast_id] || 0;
                const amount = Math.round((totalAmount * percentage) / 100);

                return (
                  <div
                    key={engagement.cast_id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        {engagement.cast?.stage_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={percentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditingValues((prev) => ({
                              ...prev,
                              [engagement.cast_id]: Math.min(
                                100,
                                Math.max(0, val)
                              ),
                            }));
                          }}
                          className="w-16 px-2 py-1 text-sm border rounded text-right"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <Percent className="w-3 h-3 text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-600 w-20 text-right">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">合計</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-medium ${
                        Math.abs(
                          Object.values(editingValues).reduce(
                            (sum, val) => sum + val,
                            0
                          ) - 100
                        ) > 0.01
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {Object.values(editingValues)
                        .reduce((sum, val) => sum + val, 0)
                        .toFixed(1)}
                      %
                    </span>
                    <span className="font-bold">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // 表示モード
            <>
              {attributions.map((attr: any) => (
                <div
                  key={attr.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">
                      {attr.cast?.stage_name || "Unknown"}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${getAttributionTypeColor(attr.attribution_type)}`}
                    >
                      {getAttributionTypeLabel(attr.attribution_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {attr.attribution_percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(attr.attribution_amount)}
                    </span>
                  </div>
                </div>
              ))}
              {totalPercentage < 99.99 && (
                <div className="text-center py-2">
                  <p className="text-xs text-orange-600">
                    合計: {totalPercentage.toFixed(1)}% (未配分:{" "}
                    {(100 - totalPercentage).toFixed(1)}%)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
