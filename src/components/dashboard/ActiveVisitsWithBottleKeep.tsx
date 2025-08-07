"use client";

import React, { useState, useEffect } from "react";
import {
  BottleKeepService,
  type BottleKeep,
} from "@/services/bottle-keep.service";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import {
  BeakerIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Visit {
  id: string;
  customer_id: string;
  table_id: string;
  check_in_time: string;
  check_out_time?: string;
  customer?: {
    id: string;
    name: string;
    phone_number?: string;
  };
  table?: {
    id: string;
    name: string;
  };
}

export function ActiveVisitsWithBottleKeep() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [bottleKeeps, setBottleKeeps] = useState<Map<string, BottleKeep[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveVisits();
    const interval = setInterval(loadActiveVisits, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadActiveVisits = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // アクティブな来店を取得
      const { data: visitsData, error: visitsError } = await supabase
        .from("visits")
        .select(
          `
          *,
          customer:customers(id, name, phone_number),
          table:tables(id, name)
        `
        )
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false });

      if (visitsError) throw visitsError;

      setVisits(visitsData || []);

      // 各顧客のボトルキープを取得
      if (visitsData && visitsData.length > 0) {
        const bottleKeepMap = new Map<string, BottleKeep[]>();

        await Promise.all(
          visitsData.map(async (visit) => {
            if (visit.customer?.id) {
              try {
                const bottles = await BottleKeepService.getBottleKeeps({
                  customerId: visit.customer.id,
                  status: "active",
                });
                if (bottles.length > 0) {
                  bottleKeepMap.set(visit.customer.id, bottles);
                }
              } catch (err) {
                console.error(
                  `Failed to load bottles for customer ${visit.customer.id}:`,
                  err
                );
              }
            }
          })
        );

        setBottleKeeps(bottleKeepMap);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
      console.error("Failed to load active visits:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "HH:mm", { locale: ja });
    } catch {
      return "-";
    }
  };

  const calculateStayDuration = (checkInTime: string) => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  };

  const getExpiringBottles = (bottles: BottleKeep[]) => {
    return bottles.filter((b) => {
      if (!b.expiry_date) return false;
      const today = new Date();
      const expiry = new Date(b.expiry_date);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            現在来店中のお客様はいません
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          来店中のお客様とボトルキープ
        </h2>
        <Badge className="bg-green-100 text-green-800">
          {visits.length} 組来店中
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visits.map((visit) => {
          const customerBottles = visit.customer?.id
            ? bottleKeeps.get(visit.customer.id) || []
            : [];
          const expiringBottles = getExpiringBottles(customerBottles);

          return (
            <div
              key={visit.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {visit.customer?.name || "名前なし"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    テーブル: {visit.table?.name || "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    <ClockIcon className="inline h-3 w-3 mr-1" />
                    {formatTime(visit.check_in_time)}
                  </p>
                  <p className="text-xs text-gray-600 font-medium">
                    {calculateStayDuration(visit.check_in_time)}
                  </p>
                </div>
              </div>

              {customerBottles.length > 0 ? (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <BeakerIcon className="h-4 w-4 mr-1" />
                      ボトルキープ {customerBottles.length}本
                    </div>
                    {expiringBottles.length > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        {expiringBottles.length}本期限間近
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {customerBottles.slice(0, 2).map((bottle) => {
                      const isExpiring = expiringBottles.includes(bottle);
                      return (
                        <div
                          key={bottle.id}
                          className={`text-xs p-2 rounded ${
                            isExpiring ? "bg-yellow-50" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">
                              {bottle.product?.name || "商品名不明"}
                            </span>
                            <span className="text-gray-500">
                              残{bottle.remaining_percentage}%
                            </span>
                          </div>
                          {bottle.storage_location && (
                            <p className="text-gray-500 mt-1">
                              保管: {bottle.storage_location}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {customerBottles.length > 2 && (
                      <p className="text-xs text-gray-500 text-center">
                        他{customerBottles.length - 2}本
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex justify-between">
                    <Link
                      href={`/bottle-keep?customerId=${visit.customer?.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      ボトル管理
                    </Link>
                    <button
                      onClick={() => {
                        // TODO: ボトル使用モーダルを開く
                        console.log("Use bottle for visit", visit.id);
                      }}
                      className="text-xs text-green-600 hover:text-green-500 font-medium"
                    >
                      ボトル使用
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 text-center">
                    ボトルキープなし
                  </p>
                  <Link
                    href={`/bottle-keep?customerId=${visit.customer?.id}`}
                    className="block mt-2 text-xs text-center text-indigo-600 hover:text-indigo-500"
                  >
                    新規登録
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
