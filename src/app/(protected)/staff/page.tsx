"use client";

import { useState, useEffect, useCallback } from "react";
import { staffService } from "@/services/staff.service";
import { StaffList, StaffForm } from "@/components/staff";
import { SearchInput } from "@/components/ui/SearchInput";
import type {
  Staff,
  CreateStaffData,
  UpdateStaffData,
} from "@/types/staff.types";
import type { UserRole } from "@/types/auth.types";
import { PlusIcon } from "@heroicons/react/24/outline";
import { usePermission } from "@/hooks/usePermission";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";

export default function StaffPage() {
  const { can } = usePermission();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await staffService.getAllStaff();

      // Filter by search query and role
      let filteredData = data;

      if (searchQuery) {
        filteredData = filteredData.filter((staff) =>
          staff.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (roleFilter) {
        filteredData = filteredData.filter(
          (staff) => staff.role === roleFilter
        );
      }

      setStaff(filteredData);
    } catch (err) {
      setError("スタッフデータの取得に失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleCreate = () => {
    setEditingStaff(null);
    setShowForm(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStaff(null);
  };

  const handleSubmit = async (data: CreateStaffData | UpdateStaffData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingStaff) {
        await staffService.updateStaff(
          editingStaff.id,
          data as UpdateStaffData
        );
      } else {
        await staffService.createStaff(data as CreateStaffData);
      }

      await loadStaff();
      setShowForm(false);
      setEditingStaff(null);
    } catch (err) {
      setError("保存に失敗しました");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staff: Staff) => {
    if (!confirm(`${staff.fullName}を削除してもよろしいですか？`)) {
      return;
    }

    try {
      setError(null);
      await staffService.deleteStaff(staff.id);
      await loadStaff();
    } catch (err) {
      setError("削除に失敗しました");
      console.error(err);
    }
  };

  const roleOptions: { value: UserRole | ""; label: string }[] = [
    { value: "", label: "すべて" },
    { value: "admin", label: "管理者" },
    { value: "manager", label: "マネージャー" },
    { value: "hall", label: "ホールスタッフ" },
    { value: "cashier", label: "会計担当" },
    { value: "cast", label: "キャスト" },
  ];

  if (showForm) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingStaff ? "スタッフ情報編集" : "新規スタッフ登録"}
          </h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <StaffForm
            staff={editingStaff || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">スタッフ管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            スタッフ情報の一覧表示と管理を行います
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <ProtectedComponent resource="staff" action="create">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              新規登録
            </button>
          </ProtectedComponent>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="名前で検索"
          />
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-500">読み込み中...</span>
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">スタッフが見つかりません</p>
          </div>
        ) : (
          <StaffList
            staff={staff}
            onEdit={can("staff", "edit") ? handleEdit : undefined}
            onDelete={can("staff", "delete") ? handleDelete : undefined}
          />
        )}
      </div>
    </div>
  );
}
