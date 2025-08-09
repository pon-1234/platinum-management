"use client";

import { useState, useEffect } from "react";
import { X, Users, Clock, CreditCard, User, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatting";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import CastEngagementDialog from "./CastEngagementDialog";
import type { Table } from "@/types/reservation.types";
import type { Visit } from "@/types/billing.types";
import { billingService } from "@/services/billing.service";
import { tableService } from "@/services/table.service";
import {
  VisitSessionService,
  type CastEngagement,
} from "@/services/visit-session.service";
import { createClient } from "@/lib/supabase/client";

interface TableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
}

export default function TableDetailModal({
  isOpen,
  onClose,
  table,
}: TableDetailModalProps) {
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(null);
  const [castEngagements, setCastEngagements] = useState<CastEngagement[]>([]);
  const [nominationFeeTotal, setNominationFeeTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCastAssignment, setShowCastAssignment] = useState(false);

  useEffect(() => {
    if (isOpen && table?.currentVisitId) {
      loadVisitDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, table]);

  const loadVisitDetails = async () => {
    if (!table?.currentVisitId) return;

    setIsLoading(true);
    try {
      // 来店情報を取得
      const visit = await billingService.getVisitById(table.currentVisitId);
      setCurrentVisit(visit);

      // キャストエンゲージメント情報を取得
      const session = await VisitSessionService.getSessionDetails(
        table.currentVisitId
      );
      if (session?.cast_engagements) {
        const activeEngagements = session.cast_engagements.filter(
          (e) => e.is_active
        );
        setCastEngagements(activeEngagements);

        // 指名料合計を計算
        const total = activeEngagements.reduce(
          (sum, e) => sum + e.fee_amount,
          0
        );
        setNominationFeeTotal(total);
      }
    } catch (error) {
      console.error("Error loading visit details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastAssignmentChange = () => {
    loadVisitDetails();
  };

  const handleCheckIn = async () => {
    if (!table) return;

    setIsLoading(true);
    try {
      // TODO: 将来的には顧客選択・人数入力のダイアログを実装
      // 一時的にデフォルトのゲスト顧客を作成または取得
      const supabase = createClient();
      const { data: customers, error: fetchError } = await supabase
        .from("customers")
        .select("id")
        .limit(1);

      let customerId: string;

      if (fetchError || !customers || customers.length === 0) {
        // ゲスト顧客を作成
        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({
            name: "ゲスト",
            name_kana: "ゲスト",
            gender: "other" as const,
            age_group: "unknown" as const,
            is_visitor: true,
          })
          .select()
          .single();

        if (createError || !newCustomer) {
          throw new Error("顧客の作成に失敗しました");
        }
        customerId = newCustomer.id;
      } else {
        customerId = customers[0].id;
      }

      const defaultGuestCount = 1;

      await VisitSessionService.createSession(
        customerId,
        parseInt(table.id, 10),
        defaultGuestCount
      );

      // テーブルステータスを更新
      await tableService.updateTableStatus(table.id, "occupied");

      // 来店情報を再読み込み
      const newVisit = await billingService.getVisitById(table.id);
      if (newVisit) {
        setCurrentVisit(newVisit);
        await loadVisitDetails();
      }

      onClose();
    } catch (error) {
      console.error("Check-in failed:", error);
      alert("来店受付に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !table) return null;

  const isOccupied = table.currentStatus === "occupied" && currentVisit;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold">{table.tableName}</h2>
              <p className="text-sm text-gray-600">定員: {table.capacity}名</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : isOccupied ? (
              <div className="space-y-6">
                {/* 来店情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    来店情報
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">来店時刻</span>
                      <span className="font-medium">
                        {format(new Date(currentVisit.checkInAt), "HH:mm", {
                          locale: ja,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">経過時間</span>
                      <span className="font-medium">
                        {Math.floor(
                          (Date.now() -
                            new Date(currentVisit.checkInAt).getTime()) /
                            1000 /
                            60
                        )}
                        分
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">人数</span>
                      <span className="font-medium">
                        {currentVisit.numGuests}名
                      </span>
                    </div>
                  </div>
                </div>

                {/* キャスト割り当て */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      担当キャスト
                    </h3>
                    <button
                      onClick={() => setShowCastAssignment(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>管理</span>
                    </button>
                  </div>

                  {castEngagements.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                      キャストが割り当てられていません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {castEngagements.map((engagement) => (
                        <div
                          key={engagement.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <span className="font-medium">
                                {engagement.cast?.stage_name || "Unknown"}
                              </span>
                              <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {engagement.nomination_type?.display_name ||
                                  engagement.role}
                              </span>
                              {engagement.role === "primary" && (
                                <span className="ml-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                  メイン
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(engagement.fee_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 会計情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    会計情報
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">小計</span>
                      <span className="font-medium">
                        {formatCurrency(currentVisit.subtotal || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">指名料</span>
                      <span className="font-medium">
                        {formatCurrency(nominationFeeTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">サービス料</span>
                      <span className="font-medium">
                        {formatCurrency(currentVisit.serviceCharge || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">税額</span>
                      <span className="font-medium">
                        {formatCurrency(currentVisit.taxAmount || 0)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">合計</span>
                        <span className="text-lg font-bold text-purple-600">
                          {formatCurrency(
                            (currentVisit.subtotal || 0) +
                              nominationFeeTotal +
                              (currentVisit.serviceCharge || 0) +
                              (currentVisit.taxAmount || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Clock className="w-4 h-4" />
                    <span>延長</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <CreditCard className="w-4 h-4" />
                    <span>会計</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">現在空席です</p>
                <button
                  onClick={handleCheckIn}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  来店受付
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* キャスト割り当てダイアログ */}
      {currentVisit && (
        <CastEngagementDialog
          isOpen={showCastAssignment}
          onClose={() => setShowCastAssignment(false)}
          visitId={currentVisit.id}
          onEngagementChange={handleCastAssignmentChange}
        />
      )}
    </>
  );
}
