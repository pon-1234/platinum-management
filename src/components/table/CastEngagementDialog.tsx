"use client";

import { useState, useEffect } from "react";
import { X, User, Clock, Crown, DollarSign, Plus } from "lucide-react";
import {
  VisitSessionService,
  type CastEngagement,
} from "@/services/visit-session.service";
import {
  NominationTypeService,
  type NominationType,
} from "@/services/nomination-type.service";
import { formatCurrency } from "@/lib/utils/formatting";

interface CastEngagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  onEngagementChange?: () => void;
}

export default function CastEngagementDialog({
  isOpen,
  onClose,
  visitId,
  onEngagementChange,
}: CastEngagementDialogProps) {
  const [engagements, setEngagements] = useState<CastEngagement[]>([]);
  const [nominationTypes, setNominationTypes] = useState<NominationType[]>([]);
  const [availableCasts, setAvailableCasts] = useState<
    Array<{
      id: string;
      stage_name: string;
      staff_code?: string;
      is_working: boolean;
    }>
  >([]);

  const [selectedCastId, setSelectedCastId] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<CastEngagement["role"]>("inhouse");
  const [selectedNominationTypeId, setSelectedNominationTypeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen && visitId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visitId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // セッション詳細を取得
      const sessionDetails =
        await VisitSessionService.getSessionDetails(visitId);
      if (sessionDetails?.cast_engagements) {
        setEngagements(
          sessionDetails.cast_engagements.filter((e) => e.is_active)
        );
      }

      // 指名種別を取得
      const types = await NominationTypeService.getAllNominationTypes();
      setNominationTypes(types);

      // 利用可能なキャストを取得（実際のAPIに合わせて調整が必要）
      // キャストを取得
      const { castService } = await import("@/services/cast.service");
      const castsResponse = await castService.getAllCasts();
      const workingCasts = castsResponse.data
        .filter((cast) => cast.isActive)
        .map((cast) => ({
          id: cast.id,
          stage_name: cast.stageName,
          staff_code: cast.staffId || undefined,
          is_working: true,
        }));
      setAvailableCasts(workingCasts);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEngagement = async () => {
    if (!selectedCastId || !selectedRole) return;

    setIsLoading(true);
    try {
      await VisitSessionService.addCastEngagement(
        visitId,
        selectedCastId,
        selectedRole,
        selectedNominationTypeId || undefined
      );

      await loadData();
      setSelectedCastId("");
      setSelectedRole("inhouse");
      setSelectedNominationTypeId("");
      setShowAddForm(false);
      onEngagementChange?.();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "キャストの割り当てに失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndEngagement = async (engagementId: string) => {
    if (!confirm("このキャストの担当を終了しますか？")) return;

    setIsLoading(true);
    try {
      await VisitSessionService.endCastEngagement(engagementId);
      await loadData();
      onEngagementChange?.();
    } catch (error) {
      console.error("Error ending engagement:", error);
      alert("担当の終了に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: CastEngagement["role"]) => {
    switch (role) {
      case "primary":
        return "本指名";
      case "inhouse":
        return "場内指名";
      case "help":
        return "ヘルプ";
      case "douhan":
        return "同伴";
      case "after":
        return "アフター";
      default:
        return role;
    }
  };

  const getRoleColor = (role: CastEngagement["role"]) => {
    switch (role) {
      case "primary":
        return "bg-purple-100 text-purple-700";
      case "inhouse":
        return "bg-blue-100 text-blue-700";
      case "help":
        return "bg-gray-100 text-gray-700";
      case "douhan":
        return "bg-pink-100 text-pink-700";
      case "after":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const calculateEngagementDuration = (engagement: CastEngagement) => {
    const start = new Date(engagement.started_at);
    const end = engagement.ended_at
      ? new Date(engagement.ended_at)
      : new Date();
    const minutes = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    return minutes;
  };

  if (!isOpen) return null;

  const activeCastIds = engagements.map((e) => e.cast_id);
  const unassignedCasts = availableCasts.filter(
    (c) => !activeCastIds.includes(c.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">キャスト管理</h2>
            <p className="text-sm text-gray-600 mt-1">訪問ID: {visitId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* アクティブなエンゲージメント一覧 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              現在のキャスト
            </h3>

            {engagements.length === 0 ? (
              <p className="text-gray-500 text-sm">
                キャストが割り当てられていません
              </p>
            ) : (
              <div className="space-y-3">
                {engagements.map((engagement) => (
                  <div
                    key={engagement.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lg">
                            {engagement.cast?.stage_name || "Unknown"}
                          </span>
                          {engagement.role === "primary" && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded ${getRoleColor(engagement.role)}`}
                          >
                            {getRoleLabel(engagement.role)}
                          </span>
                          {engagement.nomination_type && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(engagement.fee_amount)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {calculateEngagementDuration(engagement)}分
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEndEngagement(engagement.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        終了
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

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                          {cast.stage_name}{" "}
                          {cast.staff_code && `(${cast.staff_code})`}
                          {!cast.is_working && " [未出勤]"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      役割
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) =>
                        setSelectedRole(
                          e.target.value as CastEngagement["role"]
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isLoading}
                    >
                      <option value="primary">本指名</option>
                      <option value="inhouse">場内指名</option>
                      <option value="help">ヘルプ</option>
                      <option value="douhan">同伴</option>
                      <option value="after">アフター</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    指名種別（オプション）
                  </label>
                  <select
                    value={selectedNominationTypeId}
                    onChange={(e) =>
                      setSelectedNominationTypeId(e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">自動設定</option>
                    {nominationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.display_name} ({formatCurrency(type.price)} /{" "}
                        {type.back_rate}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddEngagement}
                    disabled={!selectedCastId || !selectedRole || isLoading}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedCastId("");
                      setSelectedRole("inhouse");
                      setSelectedNominationTypeId("");
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

        {/* フッター：サマリー情報 */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              アクティブ: {engagements.length}名
            </div>
            <div className="text-sm">
              合計指名料:
              <span className="ml-2 text-lg font-bold text-purple-600">
                {formatCurrency(
                  engagements.reduce((sum, e) => sum + e.fee_amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
