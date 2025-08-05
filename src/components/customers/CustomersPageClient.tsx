"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { customerService } from "@/services/customer.service";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { SearchInput } from "@/components/ui/SearchInput";
import type {
  Customer,
  CustomerStatus,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/types/customer.types";
import { PlusIcon } from "@heroicons/react/24/outline";
import { usePermission } from "@/hooks/usePermission";
import { useDebounce } from "@/hooks/useDebounce";
import { useCustomers } from "@/hooks/useCustomers";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";

interface CustomersPageClientProps {
  initialData: {
    customers: Customer[];
    error?: string;
  };
}

export function CustomersPageClient({ initialData }: CustomersPageClientProps) {
  const { can } = usePermission();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const isSearchEnabled =
    debouncedSearchQuery.length === 0 || debouncedSearchQuery.length >= 2;

  const {
    data: customers,
    isLoading,
    error,
    refetch,
  } = useCustomers(debouncedSearchQuery, statusFilter, {
    enabled: isSearchEnabled,
  });

  useEffect(() => {
    if (searchQuery.length === 1) {
      setSearchFeedback("2文字以上入力してください");
    } else {
      setSearchFeedback(null);
    }
  }, [searchQuery]);

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
    setFormError(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
    setFormError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (
    data: CreateCustomerInput | UpdateCustomerInput
  ) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      const supabase = createClient();

      if (editingCustomer) {
        await customerService.updateCustomer(
          supabase,
          editingCustomer.id,
          data as UpdateCustomerInput
        );
      } else {
        await customerService.createCustomer(
          supabase,
          data as CreateCustomerInput
        );
      }

      // Invalidate the query to refetch the list
      await queryClient.invalidateQueries({ queryKey: ["customers"] });

      setShowForm(false);
      setEditingCustomer(null);
    } catch (err) {
      setFormError("保存に失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: CustomerStatus | ""; label: string }[] = [
    { value: "", label: "すべて" },
    { value: "active", label: "通常" },
    { value: "vip", label: "VIP" },
    { value: "blocked", label: "ブロック" },
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
            error={formError}
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
          <div className="space-y-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="名前、フリガナ、電話番号、LINE IDで検索"
            />
            {searchFeedback && (
              <p className="text-sm text-amber-600">{searchFeedback}</p>
            )}
          </div>
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
            <div className="flex justify-between items-center">
              <p className="text-sm text-red-800">
                データの読み込みに失敗しました: {error.message}
              </p>
              <button
                onClick={() => refetch()}
                className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-500">読み込み中...</span>
            </div>
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">顧客が見つかりません</p>
          </div>
        ) : (
          <CustomerList
            customers={customers ?? initialData.customers}
            onEdit={can("customers", "edit") ? handleEdit : undefined}
          />
        )}
      </div>
    </div>
  );
}
