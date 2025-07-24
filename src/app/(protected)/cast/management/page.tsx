"use client";

import { useEffect, useState } from "react";
import { useCastStore } from "@/stores/cast.store";
import { PayrollExport } from "@/components/cast/PayrollExport";
import { RoleGate } from "@/components/auth/RoleGate";
import { usePermission } from "@/hooks/usePermission";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { CastRegistrationModal } from "@/components/cast/CastRegistrationModal";
import { CastEditModal } from "@/components/cast/CastEditModal";
import { CastDeleteModal } from "@/components/cast/CastDeleteModal";
import { CastDetailModal } from "@/components/cast/CastDetailModal";
import type { Cast } from "@/types/cast.types";

export default function CastManagementPage() {
  const { casts, isLoading, error, fetchCasts } = useCastStore();
  const { can } = usePermission();
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);

  useEffect(() => {
    fetchCasts({ isActive: true });
  }, [fetchCasts]);

  return (
    <RoleGate allowedRoles={["admin", "manager"]}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          キャスト管理
        </h1>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Cast List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              キャスト一覧
            </h2>
            {can("cast", "manage") && (
              <button
                onClick={() => setIsRegistrationModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                新規追加
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : casts.length === 0 ? (
            <EmptyState
              title="キャストが登録されていません"
              description="新しいキャストを追加して開始しましょう"
              action={
                can("cast", "manage") && (
                  <button
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    初回キャスト追加
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {casts.map((cast) => (
                <div
                  key={cast.staffId}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {cast.profileImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cast.profileImageUrl}
                          alt={cast.stageName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {cast.stageName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {cast.stageName}
                          </h3>
                          {!cast.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              無効
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          時給: ¥{cast.hourlyRate?.toLocaleString() || "-"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          バック率: {cast.backPercentage}%
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedCast(cast);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        title="詳細を見る"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {can("cast", "manage") && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedCast(cast);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100 transition-colors"
                            title="編集"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCast(cast);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors"
                            title="削除"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payroll Export Section */}
        {casts.length > 0 && <PayrollExport casts={casts} />}

        {/* Cast Registration Modal */}
        <CastRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => setIsRegistrationModalOpen(false)}
          onSuccess={() => {
            setIsRegistrationModalOpen(false);
            fetchCasts({ isActive: true });
          }}
        />

        {/* Cast Edit Modal */}
        {selectedCast && (
          <CastEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedCast(null);
            }}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedCast(null);
              fetchCasts({ isActive: true });
            }}
            cast={selectedCast}
          />
        )}

        {/* Cast Delete Modal */}
        {selectedCast && (
          <CastDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedCast(null);
            }}
            onSuccess={() => {
              setIsDeleteModalOpen(false);
              setSelectedCast(null);
              fetchCasts({ isActive: true });
            }}
            cast={selectedCast}
          />
        )}

        {/* Cast Detail Modal */}
        {selectedCast && (
          <CastDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedCast(null);
            }}
            cast={selectedCast}
          />
        )}
      </div>
    </RoleGate>
  );
}
