"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { attendanceService } from "@/services/attendance.service";
import type {
  ShiftRequest,
  ShiftRequestStatus,
} from "@/types/attendance.types";
import { SHIFT_REQUEST_STATUSES } from "@/types/attendance.types";
import { toast } from "react-hot-toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import ShiftRequestForm from "./ShiftRequestForm";

interface ShiftRequestListProps {
  onRequestUpdate: () => void;
}

export function ShiftRequestList({ onRequestUpdate }: ShiftRequestListProps) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ShiftRequestStatus | "all">(
    "all"
  );
  const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await attendanceService.searchShiftRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
        offset: 0,
      });
      setRequests(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("シフト申請の読み込みに失敗しました:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApproval = async (requestId: string, approved: boolean) => {
    // Optimistic UI update
    const originalRequests = [...requests];
    setRequests((prevRequests) =>
      prevRequests.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: approved
                ? "approved"
                : ("rejected" as ShiftRequestStatus),
            }
          : req
      )
    );

    try {
      await attendanceService.approveShiftRequest(requestId, {
        approved: approved,
        rejectionReason: approved ? undefined : rejectionReason,
      });

      setSelectedRequest(null);
      setRejectionReason("");
      onRequestUpdate();

      toast.success(approved ? "申請を承認しました" : "申請を却下しました");
      // Reload to get updated data from server
      loadRequests();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("承認処理に失敗しました:", error);
      }
      toast.error("処理に失敗しました。もう一度お試しください。");
      // Revert optimistic update on error
      setRequests(originalRequests);
    }
  };

  const getStatusBadge = (status: ShiftRequestStatus) => {
    const statusConfig = SHIFT_REQUEST_STATUSES.find((s) => s.value === status);
    if (!statusConfig) return null;

    const variantMap = {
      yellow: "warning" as const,
      green: "success" as const,
      red: "error" as const,
    };

    const variant =
      variantMap[statusConfig.color as keyof typeof variantMap] || "default";

    return <StatusBadge variant={variant}>{statusConfig.label}</StatusBadge>;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            シフト申請管理
          </h2>
          <div className="flex space-x-2">
            <ShiftRequestForm onRequestCreated={loadRequests} />
            <button
              onClick={loadRequests}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              更新
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            すべて
          </button>
          {SHIFT_REQUEST_STATUSES.map((status) => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              className={`px-3 py-2 text-sm rounded-md ${
                statusFilter === status.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="bg-white rounded-lg shadow">
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              申請がありません
            </h3>
            <p className="text-gray-600">現在、シフト申請はありません。</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {request.staffName || request.staffId}
                        {""}
                        {/* Display staff name or ID */}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {format(new Date(request.requestedDate), "M月d日(E)", {
                          locale: ja,
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {request.startTime} - {request.endTime}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {request.notes && (
                      <p className="text-sm text-gray-600 mb-2">
                        備考: {request.notes}
                      </p>
                    )}

                    {request.status === "rejected" &&
                      request.rejectionReason && (
                        <p className="text-sm text-red-600">
                          却下理由: {request.rejectionReason}
                        </p>
                      )}

                    <div className="text-xs text-gray-500">
                      申請日時:{""}
                      {format(new Date(request.createdAt), "yyyy/MM/dd HH:mm")}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {request.status === "pending" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproval(request.id, true)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        承認
                      </button>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        却下
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => {
          setSelectedRequest(null);
          setRejectionReason("");
        }}
        title="申請を却下"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            却下する理由を入力してください（必須）
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="却下理由を入力してください"
          />
          <div className="flex space-x-3">
            <button
              onClick={() =>
                selectedRequest && handleApproval(selectedRequest.id, false)
              }
              disabled={!rejectionReason.trim()}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                rejectionReason.trim()
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              却下する
            </button>
            <button
              onClick={() => {
                setSelectedRequest(null);
                setRejectionReason("");
              }}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
