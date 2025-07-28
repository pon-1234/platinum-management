"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";

interface InitialData {
  customers: Customer[];
  error?: string;
}

interface CustomersPageClientProps {
  initialData: InitialData;
}

export function CustomersPageClient({ initialData }: CustomersPageClientProps) {
  const { can } = usePermission();
  const [customers, setCustomers] = useState<Customer[]>(initialData.customers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(initialData.error ?? null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadCustomers = useCallback(
    async (query?: string, filter?: CustomerStatus | "") => {
      try {
        setIsLoading(true);
        setError(null);
        setSearchFeedback(null);

        const data = await customerService.searchCustomers({
          query: query ?? searchQuery,
          status: (filter ?? statusFilter) || undefined,
          limit: 50,
          offset: 0,
        });
        setCustomers(data);
      } catch (err) {
        setError("顧客データの取得に失敗しました");
        if (process.env.NODE_ENV === "development") {
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter]
  );

  const debouncedSearch = useCallback(
    (query: string, filter?: CustomerStatus | "") => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 1文字の場合はフィードバックを表示
      if (query.length === 1) {
        setSearchFeedback("2文字以上入力してください");
        return;
      }

      // 検索条件をクリア
      setSearchFeedback(null);

      // 空の場合またはベース2文字以上の場合は即座に検索
      if (query.length === 0 || query.length >= 2) {
        loadCustomers(query, filter);
        return;
      }

      // デバウンス処理
      debounceRef.current = setTimeout(() => {
        loadCustomers(query, filter);
      }, 300);
    },
    [loadCustomers]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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

  const handleSubmit = async (
    data: CreateCustomerInput | UpdateCustomerInput
  ) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingCustomer) {
        await customerService.updateCustomer(
          editingCustomer.id,
          data as UpdateCustomerInput
        );
      } else {
        await customerService.createCustomer(data as CreateCustomerInput);
      }

      await loadCustomers();
      setShowForm(false);
      setEditingCustomer(null);
    } catch (err) {
      setError("保存に失敗しました");
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
              onChange={(value) => {
                setSearchQuery(value);
                debouncedSearch(value, statusFilter);
              }}
              placeholder="名前、フリガナ、電話番号、LINE IDで検索"
            />
            {searchFeedback && (
              <p className="text-sm text-amber-600">{searchFeedback}</p>
            )}
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                const newStatus = e.target.value as CustomerStatus | "";
                setStatusFilter(newStatus);
                debouncedSearch(searchQuery, newStatus);
              }}
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
              <p className="text-sm text-red-800">{error}</p>
              {initialData.error && (
                <button
                  onClick={() => {
                    setError(null);
                    loadCustomers();
                  }}
                  className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  再試行
                </button>
              )}
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
