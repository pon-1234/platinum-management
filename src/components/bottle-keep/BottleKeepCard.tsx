"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wine, User, Calendar, MapPin } from "lucide-react";
import { BottleKeep } from "@/services/bottle-keep.service";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface BottleKeepCardProps {
  bottle: BottleKeep;
  onServe?: (bottle: BottleKeep) => void;
  onEdit?: (bottle: BottleKeep) => void;
  onViewHistory?: (bottle: BottleKeep) => void;
}

export function BottleKeepCard({
  bottle,
  onServe,
  onEdit,
  onViewHistory,
}: BottleKeepCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "consumed":
        return "bg-gray-100 text-gray-800";
      case "removed":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "利用可能";
      case "expired":
        return "期限切れ";
      case "consumed":
        return "消費済み";
      case "removed":
        return "削除済み";
      default:
        return status;
    }
  };

  const getRemainingPercentageColor = (percentage: number) => {
    if (percentage >= 0.7) return "bg-green-500";
    if (percentage >= 0.3) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wine className="h-5 w-5" />
              {bottle.product?.name || "商品名未設定"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {bottle.bottle_number}
            </p>
          </div>
          <Badge className={getStatusColor(bottle.status)}>
            {getStatusLabel(bottle.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 顧客情報 */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{bottle.customer?.name || "顧客未設定"}</span>
          {bottle.customer?.phone_number && (
            <span className="text-muted-foreground">
              ({bottle.customer.phone_number})
            </span>
          )}
        </div>

        {/* 開封日・期限 */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            開封:{" "}
            {format(new Date(bottle.opened_date), "yyyy/MM/dd", { locale: ja })}
          </span>
          {bottle.expiry_date && (
            <span className="text-muted-foreground">
              〜{" "}
              {format(new Date(bottle.expiry_date), "yyyy/MM/dd", {
                locale: ja,
              })}
            </span>
          )}
        </div>

        {/* 保管場所 */}
        {bottle.storage_location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{bottle.storage_location}</span>
            {bottle.table_number && (
              <span className="text-muted-foreground">
                (テーブル: {bottle.table_number})
              </span>
            )}
          </div>
        )}

        {/* 残量表示 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>残量</span>
            <span className="font-medium">
              {Math.round(bottle.remaining_percentage * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getRemainingPercentageColor(
                bottle.remaining_percentage
              )}`}
              style={{ width: `${bottle.remaining_percentage * 100}%` }}
            />
          </div>
        </div>

        {/* 担当スタッフ */}
        {bottle.host_staff && (
          <div className="text-sm text-muted-foreground">
            担当: {bottle.host_staff.full_name}
          </div>
        )}

        {/* 備考 */}
        {bottle.notes && (
          <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
            {bottle.notes}
          </div>
        )}

        {/* アクションボタン */}
        {bottle.status === "active" && (
          <div className="flex gap-2 pt-2">
            {onServe && (
              <Button
                size="sm"
                onClick={() => onServe(bottle)}
                className="flex-1"
              >
                提供
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(bottle)}
                className="flex-1"
              >
                編集
              </Button>
            )}
            {onViewHistory && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewHistory(bottle)}
                className="flex-1"
              >
                履歴
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
