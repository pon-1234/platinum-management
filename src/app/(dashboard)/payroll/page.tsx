"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, Calculator, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayrollDetails } from "@/components/payroll/PayrollDetails";
import { PayrollCalculationDetails } from "@/services/payroll.service";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

type CastProfile = Database["public"]["Tables"]["casts_profile"]["Row"] & {
  staffs?: {
    full_name: string;
    full_name_kana: string;
  };
};

export default function PayrollPage() {
  const [selectedCast, setSelectedCast] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [casts, setCasts] = useState<CastProfile[]>([]);
  const [calculation, setCalculation] =
    useState<PayrollCalculationDetails | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    castName: "",
  });
  const [savedCalculations, setSavedCalculations] = useState<unknown[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCasts();
    fetchSavedCalculations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchCasts = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("casts_profile")
      .select(
        `
        *,
        staffs!inner(
          full_name,
          full_name_kana
        )
      `
      )
      .eq("is_active", true);

    if (error) {
      console.error("Failed to fetch casts:", error);
      return;
    }

    setCasts(data || []);
  };

  const fetchSavedCalculations = async () => {
    const periodStart = startOfMonth(selectedMonth);
    const periodEnd = endOfMonth(selectedMonth);

    try {
      const response = await fetch(
        `/api/payroll/calculate?periodStart=${periodStart.toISOString()}&periodEnd=${periodEnd.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setSavedCalculations(data);
      }
    } catch (error) {
      console.error("Failed to fetch saved calculations:", error);
    }
  };

  const handleCalculate = async () => {
    if (!selectedCast) {
      toast({
        title: "エラー",
        description: "キャストを選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    const periodStart = startOfMonth(selectedMonth);
    const periodEnd = endOfMonth(selectedMonth);

    try {
      const response = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          castId: selectedCast,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          save: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate payroll");
      }

      const data = await response.json();

      // キャスト名を追加
      const cast = casts.find((c) => c.id === selectedCast);
      if (cast && cast.staffs) {
        data.castName = cast.staffs.full_name;
      }

      setCalculation(data);

      toast({
        title: "計算完了",
        description: "給与計算が完了しました",
      });
    } catch (error) {
      console.error("Calculation error:", error);
      toast({
        title: "エラー",
        description: "給与計算に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!calculation) return;

    try {
      const response = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          castId: calculation.castId,
          periodStart: calculation.periodStart,
          periodEnd: calculation.periodEnd,
          save: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save calculation");
      }

      toast({
        title: "保存完了",
        description: "給与計算結果を保存しました",
      });

      fetchSavedCalculations();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "エラー",
        description: "保存に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleBatchCalculate = async () => {
    setIsCalculating(true);
    setBatchProgress({ current: 0, total: casts.length, castName: "" });

    try {
      const periodStart = startOfMonth(selectedMonth);
      const periodEnd = endOfMonth(selectedMonth);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // 並列処理のバッチサイズ（同時に3件まで処理）
      const batchSize = 3;

      for (let i = 0; i < casts.length; i += batchSize) {
        const batch = casts.slice(i, Math.min(i + batchSize, casts.length));

        // バッチ内の計算を並列実行
        const batchPromises = batch.map(async (cast) => {
          setBatchProgress((prev) => ({
            ...prev,
            castName:
              (cast as unknown as { display_name?: string; nickname?: string })
                .display_name ||
              (cast as unknown as { display_name?: string; nickname?: string })
                .nickname ||
              "Unknown",
          }));

          try {
            const response = await fetch("/api/payroll/calculate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                castId: cast.id,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                save: true,
              }),
            });

            if (response.ok) {
              successCount++;
              return { success: true, castId: cast.id };
            } else {
              errorCount++;
              return {
                success: false,
                castId: cast.id,
                error: await response.text(),
              };
            }
          } catch (error) {
            errorCount++;
            return { success: false, castId: cast.id, error: String(error) };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 進捗を更新
        setBatchProgress((prev) => ({
          ...prev,
          current: Math.min(i + batchSize, casts.length),
        }));
      }

      // 結果サマリーを表示
      if (errorCount === 0) {
        toast({
          title: "一括計算完了",
          description: `${successCount}件の給与計算が正常に完了しました`,
        });
      } else {
        toast({
          title: "一括計算完了（一部エラー）",
          description: `成功: ${successCount}件, エラー: ${errorCount}件`,
          variant: "destructive",
        });
      }

      fetchSavedCalculations();
    } catch (error) {
      console.error("Batch calculation error:", error);
      toast({
        title: "エラー",
        description: "一括計算に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
      setBatchProgress({ current: 0, total: 0, castName: "" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">給与計算</h1>
        <div className="flex gap-2">
          <Button onClick={handleBatchCalculate} disabled={isCalculating}>
            <Calculator className="mr-2 h-4 w-4" />
            一括計算
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* 一括計算の進捗表示 */}
      {isCalculating && batchProgress.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>処理中: {batchProgress.castName}</span>
                <span>
                  {batchProgress.current} / {batchProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="calculate" className="w-full">
        <TabsList>
          <TabsTrigger value="calculate">個別計算</TabsTrigger>
          <TabsTrigger value="list">計算履歴</TabsTrigger>
          <TabsTrigger value="rules">ルール設定</TabsTrigger>
        </TabsList>

        <TabsContent value="calculate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>給与計算条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">対象キャスト</label>
                  <select
                    value={selectedCast}
                    onChange={(e) => setSelectedCast(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">キャストを選択</option>
                    {casts.map((cast) => (
                      <option key={cast.id} value={cast.id}>
                        {cast.staffs?.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">対象月</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedMonth, "yyyy年MM月", { locale: ja })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedMonth}
                        onSelect={(date: Date | undefined) =>
                          date && setSelectedMonth(date)
                        }
                        locale={ja}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleCalculate}
                    disabled={!selectedCast || isCalculating}
                    className="w-full"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {isCalculating ? "計算中..." : "計算実行"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {calculation && (
            <>
              <PayrollDetails calculation={calculation} />
              <div className="flex justify-end gap-2">
                <Button onClick={handleSave}>
                  <FileText className="mr-2 h-4 w-4" />
                  保存
                </Button>
                <Button variant="outline">印刷</Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>計算履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedCalculations.map((calc: unknown) => {
                  const calculation = calc as {
                    id: string;
                    casts_profile?: { staffs?: { full_name?: string } };
                    period_start: string;
                    period_end: string;
                    total_pay?: number;
                    status?: string;
                  };
                  return (
                    <div key={calculation.id} className="border rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {calculation.casts_profile?.staffs?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(calculation.period_start),
                              "yyyy/MM/dd"
                            )}{" "}
                            〜{" "}
                            {format(
                              new Date(calculation.period_end),
                              "yyyy/MM/dd"
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ¥{calculation.total_pay?.toLocaleString() || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {calculation.status === "approved"
                              ? "承認済み"
                              : "未承認"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>給与ルール設定</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                給与計算ルールの設定機能は実装中です
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
