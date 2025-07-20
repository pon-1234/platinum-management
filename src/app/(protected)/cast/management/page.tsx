"use client";

import { useState, useEffect } from "react";
import { CastService } from "@/services/cast.service";
import { PayrollExport } from "@/components/cast/PayrollExport";
import { RoleGate } from "@/components/auth/RoleGate";
import type { Cast } from "@/types/cast.types";

export default function CastManagementPage() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCasts();
  }, []);

  const loadCasts = async () => {
    try {
      const castService = new CastService();
      const data = await castService.getCasts({ isActive: true });
      setCasts(data);
    } catch (error) {
      console.error("Failed to load casts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGate allowedRoles={["admin", "manager"]}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          キャスト管理
        </h1>

        {/* Cast List */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            キャスト一覧
          </h2>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : casts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              キャストが登録されていません
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {casts.map((cast) => (
                <div
                  key={cast.staffId}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-4"
                >
                  <div className="flex items-center space-x-4">
                    {cast.profileImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cast.profileImageUrl}
                        alt={cast.nickname}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {cast.nickname.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {cast.nickname}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        時給: ¥{cast.hourlyWage?.toLocaleString() || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payroll Export Section */}
        {casts.length > 0 && <PayrollExport casts={casts} />}
      </div>
    </RoleGate>
  );
}
