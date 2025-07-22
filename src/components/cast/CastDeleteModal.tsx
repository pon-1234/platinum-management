"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { castService } from "@/services/cast.service";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { Cast } from "@/types/cast.types";

interface CastDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cast: Cast;
}

export function CastDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  cast,
}: CastDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await castService.deleteCast(cast.id);
      onSuccess();
    } catch (error) {
      console.error("Failed to delete cast:", error);
      setError(
        "キャストの削除に失敗しました。関連するデータがある場合は削除できません。"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="キャスト削除" size="md">
      <div className="space-y-6">
        {/* Warning Icon and Message */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              本当に削除しますか？
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              この操作は取り消せません。キャスト「
              <span className="font-medium text-gray-900">
                {cast.stageName}
              </span>
              」に関連するすべてのデータが削除されます。
            </p>
          </div>
        </div>

        {/* Cast Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">削除対象</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">源氏名:</span>
              <span className="font-medium">{cast.stageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">時給:</span>
              <span className="font-medium">
                ¥{cast.hourlyRate?.toLocaleString() || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">バック率:</span>
              <span className="font-medium">{cast.backPercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ステータス:</span>
              <span
                className={`font-medium ${cast.isActive ? "text-green-600" : "text-red-600"}`}
              >
                {cast.isActive ? "有効" : "無効"}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">注意事項</h4>
              <div className="text-sm text-red-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>パフォーマンス記録</li>
                  <li>売上データ</li>
                  <li>シフト記録</li>
                  <li>その他の関連データ</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorMessage message={error} />}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isDeleting && <LoadingSpinner size="sm" />}
            {isDeleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
