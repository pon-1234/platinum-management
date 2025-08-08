"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Users,
  User,
  Receipt,
  DollarSign,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  MultiGuestBillingService,
  type IndividualBill,
} from "@/lib/services/multi-guest-billing.service";
import {
  VisitGuestService,
  type VisitGuestWithCustomer,
} from "@/lib/services/visit-guest.service";
import { formatCurrency } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

interface MultiGuestBillingInterfaceProps {
  visitId: string;
  onComplete?: () => void;
}

export function MultiGuestBillingInterface({
  visitId,
  onComplete,
}: MultiGuestBillingInterfaceProps) {
  const [guests, setGuests] = useState<VisitGuestWithCustomer[]>([]);
  const [individualBills, setIndividualBills] = useState<IndividualBill[]>([]);
  const [billingMode, setBillingMode] = useState<
    "individual" | "group" | "split"
  >("individual");
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadBillingData();
  }, [visitId]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);

      // ゲスト一覧を取得
      const guestList = await VisitGuestService.getVisitGuests(visitId);
      setGuests(guestList);

      // 個別会計を計算
      const bills =
        await MultiGuestBillingService.calculateIndividualBills(visitId);
      setIndividualBills(bills);

      // 整合性を検証
      const validation =
        await MultiGuestBillingService.validateBillingConsistency(visitId);
      setValidationErrors(validation.errors);
    } catch (error) {
      console.error("Error loading billing data:", error);
      toast.error("会計データの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestToggle = (guestId: string, checked: boolean) => {
    const newSelected = new Set(selectedGuests);
    if (checked) {
      newSelected.add(guestId);
    } else {
      newSelected.delete(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const calculateTotal = () => {
    if (billingMode === "group") {
      return individualBills.reduce((sum, bill) => sum + bill.total, 0);
    }

    let total = 0;
    selectedGuests.forEach((guestId) => {
      const bill = individualBills.find((b) => b.guestId === guestId);
      if (bill) total += bill.total;
    });
    return total;
  };

  const handleIndividualPayment = async () => {
    if (selectedGuests.size === 0) {
      toast.error("支払い対象のゲストを選択してください");
      return;
    }

    try {
      setIsProcessing(true);

      const guestIds = Array.from(selectedGuests);
      await MultiGuestBillingService.processPartialCheckout(
        visitId,
        guestIds,
        paymentMethod
      );

      toast.success(`${guestIds.length}名の会計を処理しました`);
      loadBillingData();
      setSelectedGuests(new Set());
      onComplete?.();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("会計処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGroupPayment = async () => {
    try {
      setIsProcessing(true);

      const allGuestIds = guests.map((g) => g.id);
      await MultiGuestBillingService.processPartialCheckout(
        visitId,
        allGuestIds,
        paymentMethod
      );

      toast.success("全員の会計を処理しました");
      onComplete?.();
    } catch (error) {
      console.error("Error processing group payment:", error);
      toast.error("会計処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitEvenly = async () => {
    try {
      setIsProcessing(true);

      const guestIds = guests.map((g) => g.id);
      await MultiGuestBillingService.splitBillEvenly(
        visitId,
        guestIds,
        paymentMethod
      );

      toast.success("会計を均等分割しました");
      loadBillingData();
    } catch (error) {
      console.error("Error splitting bill:", error);
      toast.error("分割処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            複数ゲスト会計
          </span>
          {validationErrors.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              エラーあり
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-semibold text-destructive mb-2">
              整合性エラー:
            </p>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li
                  key={index}
                  className="text-sm text-destructive flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Tabs
          value={billingMode}
          onValueChange={(v) => setBillingMode(v as any)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="individual">
              <User className="h-4 w-4 mr-2" />
              個別会計
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              合算会計
            </TabsTrigger>
            <TabsTrigger value="split">
              <DollarSign className="h-4 w-4 mr-2" />
              分割会計
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <div className="space-y-2">
              {individualBills.map((bill) => {
                const guest = guests.find((g) => g.id === bill.guestId);
                if (!guest) return null;

                return (
                  <Card key={bill.guestId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedGuests.has(bill.guestId)}
                            onCheckedChange={(checked) =>
                              handleGuestToggle(
                                bill.guestId,
                                checked as boolean
                              )
                            }
                          />
                          <div>
                            <p className="font-medium">{guest.customer.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {guest.guest_type === "main"
                                  ? "主要"
                                  : guest.guest_type === "companion"
                                    ? "同伴"
                                    : "追加"}
                              </Badge>
                              {guest.is_primary_payer && (
                                <Badge variant="secondary" className="text-xs">
                                  支払者
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                小計:
                              </span>
                              <span>{formatCurrency(bill.subtotal)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                サービス料:
                              </span>
                              <span>{formatCurrency(bill.serviceCharge)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                税額:
                              </span>
                              <span>{formatCurrency(bill.taxAmount)}</span>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <p className="text-lg font-bold">
                            {formatCurrency(bill.total)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">参加者</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {guests.map((guest) => (
                          <Badge key={guest.id} variant="secondary">
                            {guest.customer.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">合計人数</p>
                      <p className="text-2xl font-bold">{guests.length}名</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">合計金額</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(calculateTotal())}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="split" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      分割方法
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={handleSplitEvenly}
                        disabled={isProcessing}
                      >
                        均等分割
                      </Button>
                      <Button variant="outline" disabled>
                        カスタム分割（開発中）
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-muted-foreground">合計金額</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(calculateTotal())}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        1人あたり（均等）
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          Math.ceil(calculateTotal() / guests.length)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">支払い方法:</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">現金</SelectItem>
                <SelectItem value="credit_card">クレジットカード</SelectItem>
                <SelectItem value="debit_card">デビットカード</SelectItem>
                <SelectItem value="e_money">電子マネー</SelectItem>
                <SelectItem value="qr_payment">QRコード決済</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">支払い金額</p>
              <p className="text-2xl font-bold">
                {formatCurrency(calculateTotal())}
              </p>
            </div>
            <Button
              size="lg"
              onClick={
                billingMode === "individual"
                  ? handleIndividualPayment
                  : billingMode === "group"
                    ? handleGroupPayment
                    : handleSplitEvenly
              }
              disabled={
                isProcessing ||
                (billingMode === "individual" && selectedGuests.size === 0)
              }
            >
              <Check className="h-5 w-5 mr-2" />
              {isProcessing ? "処理中..." : "会計を確定"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
