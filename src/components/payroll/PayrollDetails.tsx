"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PayrollCalculationDetails } from "@/services/payroll.service";

interface PayrollDetailsProps {
  calculation: PayrollCalculationDetails & {
    id?: string;
    status?: string;
    castName?: string;
  };
}

export function PayrollDetails({ calculation }: PayrollDetailsProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default">承認済み</Badge>;
      case "confirmed":
        return <Badge variant="secondary">確定</Badge>;
      case "draft":
        return <Badge variant="outline">下書き</Badge>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatPercentage = (rate?: number) => {
    if (!rate) return "-";
    return `${rate}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>給与明細</CardTitle>
            <CardDescription>
              {format(calculation.periodStart, "yyyy年MM月dd日", {
                locale: ja,
              })}{" "}
              〜{" "}
              {format(calculation.periodEnd, "yyyy年MM月dd日", { locale: ja })}
            </CardDescription>
          </div>
          {getStatusBadge(calculation.status)}
        </div>
        {calculation.castName && (
          <div className="mt-2">
            <span className="text-sm text-muted-foreground">対象者: </span>
            <span className="font-medium">{calculation.castName}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">売上合計</p>
            <p className="text-xl font-bold">
              {formatCurrency(calculation.totalSales)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">基本給</p>
            <p className="text-xl font-bold">
              {formatCurrency(calculation.basePay)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">歩合給</p>
            <p className="text-xl font-bold">
              {formatCurrency(calculation.backPay)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">指名料</p>
            <p className="text-xl font-bold">
              {formatCurrency(calculation.nominationPay)}
            </p>
          </div>
        </div>

        <Separator />

        {/* 詳細項目 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">計算詳細</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">基準額</TableHead>
                <TableHead className="text-right">レート</TableHead>
                <TableHead className="text-right">計算額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculation.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.type === "base" && "基本給"}
                      {item.type === "back" && "歩合"}
                      {item.type === "nomination" && "指名"}
                      {item.type === "bonus" && "ボーナス"}
                      {item.type === "deduction" && "控除"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.type === "base" && item.metadata?.hours
                      ? `${item.metadata.hours}時間`
                      : formatCurrency(item.baseAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.type === "base" && item.rate
                      ? `${formatCurrency(item.rate)}/時`
                      : formatPercentage(item.rate)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.calculatedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* 合計 */}
        <div className="flex justify-end">
          <div className="space-y-2">
            <div className="flex items-center gap-8">
              <span className="text-sm text-muted-foreground">小計</span>
              <span className="text-lg">
                {formatCurrency(calculation.totalPay)}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <span className="text-sm text-muted-foreground">控除額</span>
              <span className="text-lg">{formatCurrency(0)}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold">支給額</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calculation.totalPay)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
