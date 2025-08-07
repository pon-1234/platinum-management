"use client";

import React, { useState, useEffect } from "react";
import { BottleKeepCard } from "@/components/bottle-keep/BottleKeepCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wine, Plus, Search, Filter, BarChart3 } from "lucide-react";
import { BottleKeep, BottleKeepService } from "@/services/bottle-keep.service";

export default function BottleKeepPage() {
  const [bottles, setBottles] = useState<BottleKeep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "active" | "expired" | "consumed" | "all"
  >("active");
  const [statistics, setStatistics] = useState({
    total_active: 0,
    total_expired: 0,
    total_consumed: 0,
    expiring_soon: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBottles();
    fetchStatistics();
  }, [activeTab]);

  const fetchBottles = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? undefined : activeTab;
      const data = await BottleKeepService.getBottleKeeps(status);
      setBottles(data);
    } catch (error) {
      console.error("Failed to fetch bottles:", error);
      toast({
        title: "エラー",
        description: "ボトルキープの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await BottleKeepService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const handleServe = async (bottle: BottleKeep) => {
    // TODO: 提供モーダルを開く
    console.log("Serve bottle:", bottle);
  };

  const handleEdit = async (bottle: BottleKeep) => {
    // TODO: 編集モーダルを開く
    console.log("Edit bottle:", bottle);
  };

  const handleViewHistory = async (bottle: BottleKeep) => {
    // TODO: 履歴モーダルを開く
    console.log("View history:", bottle);
  };

  const filteredBottles = bottles.filter((bottle) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      bottle.bottle_number.toLowerCase().includes(searchLower) ||
      bottle.customer?.name?.toLowerCase().includes(searchLower) ||
      bottle.product?.name?.toLowerCase().includes(searchLower) ||
      bottle.storage_location?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wine className="h-8 w-8" />
          ボトルキープ管理
        </h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              利用可能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.total_active}
            </div>
            <p className="text-xs text-muted-foreground">本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              期限間近
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.expiring_soon}
            </div>
            <p className="text-xs text-muted-foreground">7日以内</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              期限切れ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.total_expired}
            </div>
            <p className="text-xs text-muted-foreground">本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              消費済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {statistics.total_consumed}
            </div>
            <p className="text-xs text-muted-foreground">本</p>
          </CardContent>
        </Card>
      </div>

      {/* 検索バー */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="ボトル番号、顧客名、商品名、保管場所で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          フィルター
        </Button>
        <Button variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          レポート
        </Button>
      </div>

      {/* タブとボトル一覧 */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList>
          <TabsTrigger value="active">
            利用可能 ({statistics.total_active})
          </TabsTrigger>
          <TabsTrigger value="expired">
            期限切れ ({statistics.total_expired})
          </TabsTrigger>
          <TabsTrigger value="consumed">
            消費済み ({statistics.total_consumed})
          </TabsTrigger>
          <TabsTrigger value="all">すべて</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBottles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Wine className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  ボトルキープが見つかりません
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  検索条件を変更するか、新規登録してください
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBottles.map((bottle) => (
                <BottleKeepCard
                  key={bottle.id}
                  bottle={bottle}
                  onServe={handleServe}
                  onEdit={handleEdit}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
