"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { ShoppingCart, User } from "lucide-react";
import {
  VisitGuestService,
  VisitGuestWithCustomer,
} from "@/services/visit-guest.service";
import {
  MultiGuestOrderService,
  GuestOrderWithDetails,
} from "@/services/multi-guest-order.service";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface GuestOrderManagementProps {
  visitId: string;
  orderItemId?: number;
  onOrderAssigned?: () => void;
}

interface GuestOrderSummary {
  guest: VisitGuestWithCustomer;
  orders: GuestOrderWithDetails[];
  total: number;
}

export function GuestOrderManagementModern({
  visitId,
  orderItemId,
  onOrderAssigned,
}: GuestOrderManagementProps) {
  const [guests, setGuests] = useState<VisitGuestWithCustomer[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [guestOrderSummaries, setGuestOrderSummaries] = useState<
    GuestOrderSummary[]
  >([]);
  const [isSharedOrder, setIsSharedOrder] = useState(false);
  const [sharedPercentages, setSharedPercentages] = useState<
    Map<string, number>
  >(new Map());
  const [loading, setLoading] = useState(false);

  const fetchGuestsAndOrders = useCallback(async () => {
    const guestList = await VisitGuestService.getVisitGuests(visitId);
    setGuests(guestList);

    if (guestList.length > 0 && !selectedGuestId) {
      setSelectedGuestId(guestList[0].id);
    }

    // Fetch orders for each guest
    const summaries: GuestOrderSummary[] = [];
    for (const guest of guestList) {
      const orders = await MultiGuestOrderService.getGuestOrders(guest.id);
      const total = orders.reduce(
        (sum, order) => sum + order.amount_for_guest,
        0
      );
      summaries.push({ guest, orders, total });
    }
    setGuestOrderSummaries(summaries);
  }, [visitId, selectedGuestId]);

  useEffect(() => {
    fetchGuestsAndOrders();
  }, [visitId, fetchGuestsAndOrders]);

  const handleAssignOrder = async () => {
    if (!orderItemId) return;

    setLoading(true);
    try {
      if (isSharedOrder) {
        // Get order item details
        const supabase = createClient();
        const { data: orderItem } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("id", orderItemId)
          .single();

        if (!orderItem) {
          throw new Error("Order item not found");
        }

        // Create shared order with percentages
        const guestShares = Array.from(sharedPercentages.entries()).map(
          ([guestId, percentage]) => ({
            guestId,
            percentage,
          })
        );

        await MultiGuestOrderService.createSharedOrder(
          visitId,
          orderItem.product_id,
          orderItem.quantity,
          guestShares
        );
      } else {
        // Assign to single guest
        if (selectedGuestId) {
          // Get order item details to calculate amount
          const supabase = createClient();
          const { data: orderItem } = await supabase
            .from("order_items")
            .select("quantity, unit_price")
            .eq("id", orderItemId)
            .single();

          if (orderItem) {
            const amount = orderItem.quantity * orderItem.unit_price;
            await MultiGuestOrderService.assignOrderToGuest(
              orderItemId,
              selectedGuestId,
              orderItem.quantity,
              amount
            );
          }
        }
      }

      onOrderAssigned?.();
      await fetchGuestsAndOrders();
    } catch (error) {
      console.error("Error assigning order:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSharedPercentage = (guestId: string, percentage: number) => {
    const newPercentages = new Map(sharedPercentages);
    if (percentage > 0) {
      newPercentages.set(guestId, percentage);
    } else {
      newPercentages.delete(guestId);
    }
    setSharedPercentages(newPercentages);
  };

  const totalPercentage = Array.from(sharedPercentages.values()).reduce(
    (sum, p) => sum + p,
    0
  );

  return (
    <div className="space-y-4">
      {orderItemId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              注文の割り当て
            </CardTitle>
            <CardDescription>
              この注文をどのゲストに割り当てますか？
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="shared-order"
                checked={isSharedOrder}
                onChange={(e) => setIsSharedOrder(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="shared-order">複数ゲストで共有</Label>
            </div>

            {!isSharedOrder ? (
              <div className="space-y-2">
                <Label>割り当て先のゲスト</Label>
                <Select
                  value={selectedGuestId}
                  onValueChange={setSelectedGuestId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ゲストを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map((guest) => (
                      <SelectItem key={guest.id} value={guest.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {guest.customer.name}
                          {guest.guest_type === "main" && (
                            <Badge variant="default" className="ml-2">
                              主要
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>各ゲストの負担割合 (%)</Label>
                {guests.map((guest) => (
                  <div key={guest.id} className="flex items-center gap-2">
                    <Label className="w-32">{guest.customer.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={sharedPercentages.get(guest.id) || 0}
                      onChange={(e) =>
                        updateSharedPercentage(
                          guest.id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-24"
                    />
                    <span>%</span>
                  </div>
                ))}
                {totalPercentage !== 100 && totalPercentage > 0 && (
                  <p className="text-sm text-destructive">
                    合計が100%になるように調整してください（現在:{" "}
                    {totalPercentage}%）
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleAssignOrder}
              disabled={loading || (isSharedOrder && totalPercentage !== 100)}
              className="w-full"
            >
              {loading ? "処理中..." : "注文を割り当て"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">ゲスト別サマリー</TabsTrigger>
          <TabsTrigger value="details">注文詳細</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {guestOrderSummaries.map((summary) => (
            <Card key={summary.guest.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {summary.guest.customer.name}
                    {summary.guest.guest_type === "main" && (
                      <Badge variant="default">主要</Badge>
                    )}
                    {summary.guest.is_primary_payer && (
                      <Badge variant="destructive">支払者</Badge>
                    )}
                  </div>
                  <span className="text-lg font-bold">
                    {formatCurrency(summary.total)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>注文数:</span>
                    <span>{summary.orders.length}件</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>小計:</span>
                    <span>
                      {formatCurrency(summary.guest.individual_subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>サービス料:</span>
                    <span>
                      {formatCurrency(summary.guest.individual_service_charge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>税額:</span>
                    <span>
                      {formatCurrency(summary.guest.individual_tax_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>合計:</span>
                    <span>
                      {formatCurrency(summary.guest.individual_total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {guestOrderSummaries.map((summary) => (
            <Card key={summary.guest.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {summary.guest.customer.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {order.order_item.product.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          数量: {order.quantity_for_guest}
                          {order.is_shared_item && (
                            <Badge variant="outline" className="ml-2">
                              共有 ({order.shared_percentage}%)
                            </Badge>
                          )}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(order.amount_for_guest)}
                      </span>
                    </div>
                  ))}
                  {summary.orders.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      注文がありません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
