"use client";

import { useState, useEffect } from "react";
import { X, User, Plus, Crown, Clock } from "lucide-react";
import {
  CastAssignmentService,
  type VisitCastAssignment,
} from "@/lib/services/cast-assignment.service";
import {
  NominationTypeService,
  type NominationType,
} from "@/lib/services/nomination-type.service";
import { formatCurrency } from "@/lib/utils/formatting";

interface CastAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  onAssignmentChange?: () => void;
}

export default function CastAssignmentDialog({
  isOpen,
  onClose,
  visitId,
  onAssignmentChange,
}: CastAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<VisitCastAssignment[]>([]);
  const [nominationTypes, setNominationTypes] = useState<NominationType[]>([]);
  const [availableCasts, setAvailableCasts] = useState<
    Array<{
      id: string;
      name: string;
      staff_code?: string;
      is_working: boolean;
    }>
  >([]);
  const [selectedCastId, setSelectedCastId] = useState("");
  const [selectedNominationTypeId, setSelectedNominationTypeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [totalNominationFee, setTotalNominationFee] = useState(0);

  useEffect(() => {
    if (isOpen && visitId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visitId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, typesData, castsData, feesData] =
        await Promise.all([
          CastAssignmentService.getVisitAssignments(visitId),
          NominationTypeService.getAllNominationTypes(),
          CastAssignmentService.getAvailableCasts(),
          CastAssignmentService.calculateNominationFees(visitId),
        ]);

      setAssignments(assignmentsData);
      setNominationTypes(typesData);
      setAvailableCasts(castsData);
      setTotalNominationFee(feesData.total);

      // デフォルトの指名種別を設定
      if (typesData.length > 0 && !selectedNominationTypeId) {
        setSelectedNominationTypeId(typesData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignCast = async () => {
    if (!selectedCastId || !selectedNominationTypeId) return;

    setIsLoading(true);
    try {
      await CastAssignmentService.assignCastToVisit({
        visit_id: visitId,
        cast_id: selectedCastId,
        nomination_type_id: selectedNominationTypeId,
        is_primary: assignments.length === 0, // 最初のキャストは自動的にメインに
      });

      await loadData();
      setSelectedCastId("");
      setShowAddForm(false);
      onAssignmentChange?.();
    } catch (error) {
      console.error("Error assigning cast:", error);
      alert("キャストの割り当てに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("このキャストの割り当てを解除しますか？")) return;

    setIsLoading(true);
    try {
      await CastAssignmentService.removeAssignment(assignmentId);
      await loadData();
      onAssignmentChange?.();
    } catch (error) {
      console.error("Error removing assignment:", error);
      alert("割り当ての解除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (castId: string) => {
    setIsLoading(true);
    try {
      await CastAssignmentService.setPrimaryCast(visitId, castId);
      await loadData();
      onAssignmentChange?.();
    } catch (error) {
      console.error("Error setting primary cast:", error);
      alert("メインキャストの設定に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndAssignment = async (assignmentId: string) => {
    if (!confirm("このキャストの担当を終了しますか？")) return;

    setIsLoading(true);
    try {
      await CastAssignmentService.endAssignment(assignmentId);
      await loadData();
      onAssignmentChange?.();
    } catch (error) {
      console.error("Error ending assignment:", error);
      alert("担当の終了に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const assignedCastIds = assignments.map((a) => a.cast_id);
  const unassignedCasts = availableCasts.filter(
    (c) => !assignedCastIds.includes(c.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">キャスト割り当て管理</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 現在の割り当て一覧 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              現在の割り当て
            </h3>

            {assignments.length === 0 ? (
              <p className="text-gray-500 text-sm">
                まだキャストが割り当てられていません
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {assignment.cast?.name}
                          </span>
                          {assignment.is_primary && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {assignment.nomination_type?.display_name}
                          </span>
                          <span>
                            {formatCurrency(
                              assignment.nomination_type?.price || 0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!assignment.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(assignment.cast_id)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="メインに設定"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      )}
                      {!assignment.ended_at && (
                        <button
                          onClick={() => handleEndAssignment(assignment.id)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="担当終了"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* キャスト追加フォーム */}
          {showAddForm ? (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                キャストを追加
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャスト
                  </label>
                  <select
                    value={selectedCastId}
                    onChange={(e) => setSelectedCastId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">選択してください</option>
                    {unassignedCasts.map((cast) => (
                      <option key={cast.id} value={cast.id}>
                        {cast.name} {cast.staff_code && `(${cast.staff_code})`}
                        {!cast.is_working && " [未出勤]"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    指名種別
                  </label>
                  <select
                    value={selectedNominationTypeId}
                    onChange={(e) =>
                      setSelectedNominationTypeId(e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    {nominationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.display_name} ({formatCurrency(type.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAssignCast}
                    disabled={
                      !selectedCastId || !selectedNominationTypeId || isLoading
                    }
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    割り当てる
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedCastId("");
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>キャストを追加</span>
            </button>
          )}
        </div>

        {/* フッター：指名料合計 */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              指名料合計
            </span>
            <span className="text-xl font-bold text-purple-600">
              {formatCurrency(totalNominationFee)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
