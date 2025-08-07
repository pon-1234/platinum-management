"use client";

import React from "react";
import { BottleKeep } from "@/services/bottle-keep.service";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  BeakerIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
// import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CustomerBottleKeepSectionProps {
  customerId: string;
  bottleKeeps: BottleKeep[];
  onUpdate?: () => void;
}

export function CustomerBottleKeepSection({
  customerId,
  bottleKeeps,
}: CustomerBottleKeepSectionProps) {
  // const [isLoading, setIsLoading] = useState(false);

  const getStatusIcon = (status: BottleKeep["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "expired":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case "consumed":
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: BottleKeep["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">利用可能</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">期限切れ</Badge>;
      case "consumed":
        return <Badge className="bg-gray-100 text-gray-800">消費済み</Badge>;
      case "removed":
        return <Badge className="bg-gray-100 text-gray-800">削除済み</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy年MM月dd日", { locale: ja });
    } catch {
      return "-";
    }
  };

  const calculateDaysUntilExpiry = (expiryDate: string | undefined) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const activeBottles = bottleKeeps.filter((b) => b.status === "active");
  // const expiredBottles = bottleKeeps.filter((b) => b.status === "expired");
  const consumedBottles = bottleKeeps.filter((b) => b.status === "consumed");

  // 期限間近のボトルをチェック（30日以内）
  const expiringBottles = activeBottles.filter((b) => {
    const days = calculateDaysUntilExpiry(b.expiry_date);
    return days !== null && days > 0 && days <= 30;
  });

  if (bottleKeeps.length === 0) {
    return (
      <div className="text-center py-8">
        <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          ボトルキープの記録がありません
        </p>
        <div className="mt-4">
          <Link
            href={`/bottle-keep?customerId=${customerId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            新規ボトルキープ登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 統計サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-green-600">利用可能</p>
              <p className="text-2xl font-bold text-green-900">
                {activeBottles.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-yellow-600">期限間近</p>
              <p className="text-2xl font-bold text-yellow-900">
                {expiringBottles.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">消費済み</p>
              <p className="text-2xl font-bold text-gray-900">
                {consumedBottles.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 期限間近の警告 */}
      {expiringBottles.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                期限間近のボトルがあります
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {expiringBottles.map((bottle) => {
                    const days = calculateDaysUntilExpiry(bottle.expiry_date);
                    return (
                      <li key={bottle.id}>
                        {bottle.product?.name} (ボトル番号:{" "}
                        {bottle.bottle_number}) - 残り{days}日
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ボトルキープリスト */}
      <div className="space-y-4">
        {bottleKeeps.map((bottle) => {
          const daysUntilExpiry = calculateDaysUntilExpiry(bottle.expiry_date);
          const isExpiringSoon =
            daysUntilExpiry !== null &&
            daysUntilExpiry > 0 &&
            daysUntilExpiry <= 30;

          return (
            <div
              key={bottle.id}
              className={`border rounded-lg p-4 ${
                bottle.status === "expired"
                  ? "bg-red-50 border-red-200"
                  : isExpiringSoon
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(bottle.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {bottle.product?.name || "商品名不明"}
                    </h4>
                    <p className="text-sm text-gray-500">
                      ボトル番号: {bottle.bottle_number}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      <p>開封日: {formatDate(bottle.opened_date)}</p>
                      <p>
                        有効期限: {formatDate(bottle.expiry_date)}
                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                          <span
                            className={`ml-2 font-medium ${
                              daysUntilExpiry <= 7
                                ? "text-red-600"
                                : daysUntilExpiry <= 30
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}
                          >
                            (残り{daysUntilExpiry}日)
                          </span>
                        )}
                      </p>
                      <p>残量: {bottle.remaining_percentage}%</p>
                      {bottle.storage_location && (
                        <p>保管場所: {bottle.storage_location}</p>
                      )}
                      {bottle.last_served_date && (
                        <p>最終提供日: {formatDate(bottle.last_served_date)}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {getStatusBadge(bottle.status)}
                  {bottle.status === "active" && (
                    <Link
                      href={`/bottle-keep?bottleId=${bottle.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      詳細を見る
                    </Link>
                  )}
                </div>
              </div>
              {bottle.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">備考:</p>
                  <p className="whitespace-pre-wrap">{bottle.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* アクションボタン */}
      <div className="mt-6 flex justify-between">
        <Link
          href={`/bottle-keep?customerId=${customerId}`}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          新規ボトルキープ登録
        </Link>
        <Link
          href="/bottle-keep"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          全てのボトルキープを見る
        </Link>
      </div>
    </div>
  );
}
