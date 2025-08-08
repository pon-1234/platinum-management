"use client";

import { useState, useEffect } from "react";
import { X, Users, Clock, CreditCard, User, Plus } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import CastAssignmentDialog from "./CastAssignmentDialog";
import type { Table } from "@/types/reservation.types";
import type { Visit } from "@/types/billing.types";
import { billingService } from "@/services/billing.service";
import {
  CastAssignmentService,
  type VisitCastAssignment,
} from "@/lib/services/cast-assignment.service";

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
  const [castAssignments, setCastAssignments] = useState<VisitCastAssignment[]>(
    []
  );
  const [nominationFeeTotal, setNominationFeeTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCastAssignment, setShowCastAssignment] = useState(false);

  useEffect(() => {
    if (isOpen && table?.currentVisitId) {
      loadVisitDetails();
    }
  }, [isOpen, table]);

  const loadVisitDetails = async () => {
    if (!table?.currentVisitId) return;

    setIsLoading(true);
    try {
      // 来店情報を取得
      const visit = await billingService.getVisitById(table.currentVisitId);
      setCurrentVisit(visit);

      // キャスト割り当て情報を取得
      const assignments = await CastAssignmentService.getVisitAssignments(
        table.currentVisitId
      );
      setCastAssignments(assignments);

      // 指名料合計を取得
      const fees = await CastAssignmentService.calculateNominationFees(
        table.currentVisitId
      );
      setNominationFeeTotal(fees.total);
    } catch (error) {
      console.error("Error loading visit details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastAssignmentChange = () => {
    loadVisitDetails();
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

                  {castAssignments.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                      キャストが割り当てられていません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {castAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <span className="font-medium">
                                {assignment.cast?.name}
                              </span>
                              <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {assignment.nomination_type?.display_name}
                              </span>
                              {assignment.is_primary && (
                                <span className="ml-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                  メイン
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(
                              assignment.nomination_type?.price || 0
                            )}
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
                <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  来店受付
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* キャスト割り当てダイアログ */}
      {currentVisit && (
        <CastAssignmentDialog
          isOpen={showCastAssignment}
          onClose={() => setShowCastAssignment(false)}
          visitId={currentVisit.id}
          onAssignmentChange={handleCastAssignmentChange}
        />
      )}
    </>
  );
}
