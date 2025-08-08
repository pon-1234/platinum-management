"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { customerService } from "@/services/customer.service";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { VisitHistory } from "@/components/customers/VisitHistory";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import type { Customer, Visit } from "@/types/customer.types";
import {
  BottleKeepService,
  type BottleKeep,
} from "@/services/bottle-keep.service";
import { CustomerBottleKeepSection } from "@/components/customers/CustomerBottleKeepSection";
import {
  PencilIcon,
  ArrowLeftIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CakeIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";

interface CustomerDetailClientProps {
  customer: Customer | null;
  visits: Visit[];
  error: string | null;
}

export function CustomerDetailClient({
  customer: initialCustomer,
  visits: initialVisits,
  error: initialError,
}: CustomerDetailClientProps) {
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [bottleKeeps, setBottleKeeps] = useState<BottleKeep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Load bottle keeps on mount
  useEffect(() => {
    if (customer) {
      loadBottleKeeps();
    }
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBottleKeeps = async () => {
    if (!customer) return;

    try {
      const bottles = await BottleKeepService.getBottleKeeps(
        undefined,
        customer.id
      );
      setBottleKeeps(bottles);
    } catch (err) {
      console.error("Failed to load bottle keeps:", err);
    }
  };

  const loadCustomerData = async () => {
    if (!customer) return;

    try {
      const supabase = createClient();
      const customerData = await customerService.getCustomerById(
        supabase,
        customer.id
      );
      if (!customerData) {
        setError("顧客が見つかりません");
        return;
      }

      setCustomer(customerData);

      const visitsData = await customerService.getCustomerVisits(
        supabase,
        customer.id
      );
      setVisits(visitsData);

      // Reload bottle keeps
      await loadBottleKeeps();
    } catch (err) {
      setError("データの取得に失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!customer) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await customerService.updateCustomer(supabase, customer.id, data as any);
      await loadCustomerData();
      setIsEditing(false);
    } catch (err) {
      setError("保存に失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error && !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/customers"
            className="text-indigo-600 hover:text-indigo-500"
          >
            顧客一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  if (isEditing) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">顧客情報編集</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <CustomerForm
            customer={customer}
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/customers"
              className="mr-4 text-gray-400 hover:text-gray-500"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">顧客詳細</h1>
          </div>
          <ProtectedComponent resource="customers" action="edit">
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
              編集
            </button>
          </ProtectedComponent>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {customer.name}
              </h3>
              {customer.nameKana && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {customer.nameKana}
                </p>
              )}
            </div>
            <CustomerStatusBadge status={customer.status} />
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            {customer.phoneNumber && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  電話番号
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.phoneNumber}
                </dd>
              </div>
            )}
            {customer.lineId && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
                  LINE ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.lineId}
                </dd>
              </div>
            )}
            {customer.birthday && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CakeIcon className="h-5 w-5 mr-2" />
                  誕生日
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(customer.birthday)}
                </dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                登録日
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDateTime(customer.createdAt)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                最終更新日
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDateTime(customer.updatedAt)}
              </dd>
            </div>
            {customer.memo && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">メモ</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                  {customer.memo}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            ボトルキープ
          </h3>
          <CustomerBottleKeepSection
            customerId={customer.id}
            bottleKeeps={bottleKeeps}
            onUpdate={loadBottleKeeps}
          />
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            来店履歴
          </h3>
          <VisitHistory visits={visits} />
        </div>
      </div>
    </div>
  );
}
