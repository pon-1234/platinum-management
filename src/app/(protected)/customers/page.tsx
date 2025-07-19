"use client";

import { useState, useEffect, useCallback } from "react";
import { CustomerService } from "@/services/customer.service";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Customer, CustomerStatus } from "@/types/customer.types";
import { PlusIcon } from "@heroicons/react/24/outline";
import { usePermission } from "@/hooks/usePermission";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";

export default function CustomersPage() {
  const { can } = usePermission();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerService();

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await customerService.searchCustomers({
        query: searchQuery,
        status: statusFilter || undefined,
      });
      setCustomers(data);
    } catch (err) {
      setError("顧客データの取得に失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, data);
      } else {
        await customerService.createCustomer(data);
      }

      await loadCustomers();
      setShowForm(false);
      setEditingCustomer(null);
    } catch (err) {
      setError("保存に失敗しました");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: CustomerStatus | ""; label: string }[] = [
    { value: "", label: "すべて" },
    { value: "normal", label: "通常" },
    { value: "vip", label: "VIP" },
    { value: "caution", label: "要注意" },
    { value: "blacklisted", label: "ブラックリスト" },
  ];

  if (showForm) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingCustomer ? "顧客情報編集" : "新規顧客登録"}
          </h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <CustomerForm
            customer={editingCustomer || undefined}
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
          <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            顧客情報の一覧表示と管理を行います
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <ProtectedComponent resource="customers" action="create">
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
            placeholder="名前、フリガナ、電話番号、LINE IDで検索"
          />
          <div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CustomerStatus | "")
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {statusOptions.map((option) => (
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
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">顧客が見つかりません</p>
          </div>
        ) : (
          <CustomerList
            customers={customers}
            onEdit={can("customers", "edit") ? handleEdit : undefined}
          />
        )}
      </div>
    </div>
  );
}
