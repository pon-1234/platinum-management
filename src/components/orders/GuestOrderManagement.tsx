"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, ShoppingCart, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  VisitGuestService,
  type VisitGuestWithCustomer,
} from "@/services/visit-guest.service";
import {
  MultiGuestOrderService,
  type GuestOrderWithDetails,
} from "@/services/multi-guest-order.service";
import { formatCurrency } from "@/lib/utils";
// import { ProductSelectModal } from "./ProductSelectModal";
import { SharedOrderDialog } from "./SharedOrderDialog";

interface GuestOrderManagementProps {
  visitId: string;
  onOrdersUpdated?: () => void;
}

export function GuestOrderManagement({
  visitId,
  onOrdersUpdated,
}: GuestOrderManagementProps) {
  const [guests, setGuests] = useState<VisitGuestWithCustomer[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [guestOrders, setGuestOrders] = useState<
    Map<string, GuestOrderWithDetails[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [showSharedOrder, setShowSharedOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number } | null>(
    null
  );

  useEffect(() => {
    loadGuestsAndOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  const loadGuestsAndOrders = async () => {
    try {
      setIsLoading(true);

      // ゲスト一覧を取得
      const guestList = await VisitGuestService.getVisitGuests(visitId);
      setGuests(guestList);

      if (guestList.length > 0 && !selectedGuestId) {
        setSelectedGuestId(guestList[0].id);
      }

      // 各ゲストの注文を取得
      const ordersMap = new Map<string, GuestOrderWithDetails[]>();
      for (const guest of guestList) {
        const orders = await MultiGuestOrderService.getGuestOrders(guest.id);
        ordersMap.set(guest.id, orders);
      }
      setGuestOrders(ordersMap);
    } catch (error) {
      console.error("Error loading guests and orders:", error);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProductSelect = async (
    product: { id: number; name: string; price: number },
    quantity: number
  ) => {
    if (!selectedGuestId) {
      toast.error("ゲストを選択してください");
      return;
    }

    try {
      await MultiGuestOrderService.createGuestOrder(
        visitId,
        selectedGuestId,
        product.id,
        quantity
      );

      toast.success("注文を追加しました");
      loadGuestsAndOrders();
      onOrdersUpdated?.();
      setShowProductSelect(false);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("注文の追加に失敗しました");
    }
  };

  const handleSharedOrder = async (
    guestShares: { guestId: string; percentage: number }[]
  ) => {
    if (!selectedProduct) return;

    try {
      await MultiGuestOrderService.createSharedOrder(
        visitId,
        selectedProduct.id,
        1,
        guestShares
      );

      toast.success("共有注文を作成しました");
      loadGuestsAndOrders();
      onOrdersUpdated?.();
      setShowSharedOrder(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error creating shared order:", error);
      toast.error("共有注文の作成に失敗しました");
    }
  };

  const selectedGuest = guests.find((g) => g.id === selectedGuestId);
  // const selectedGuestOrders = guestOrders.get(selectedGuestId) || [];

  const calculateGuestTotal = (orders: GuestOrderWithDetails[]) => {
    return orders.reduce((sum, order) => sum + order.amount_for_guest, 0);
  };

  const getGuestTypeColor = (type: string) => {
    switch (type) {
      case "main":
        return "default";
      case "companion":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            ゲスト別注文管理
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSharedOrder(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              共有注文
            </Button>
            <Button size="sm" onClick={() => setShowProductSelect(true)}>
              <Plus className="h-4 w-4 mr-2" />
              注文追加
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedGuestId} onValueChange={setSelectedGuestId}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(guests.length, 4)}, 1fr)`,
            }}
          >
            {guests.map((guest) => (
              <TabsTrigger
                key={guest.id}
                value={guest.id}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="truncate">{guest.customer.name}</span>
                <Badge
                  variant={getGuestTypeColor(guest.guest_type)}
                  className="ml-1"
                >
                  {guest.guest_type === "main"
                    ? "主"
                    : guest.guest_type === "companion"
                      ? "同"
                      : "追"}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {guests.map((guest) => (
            <TabsContent key={guest.id} value={guest.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{guest.customer.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getGuestTypeColor(guest.guest_type)}>
                          {guest.guest_type === "main"
                            ? "主要顧客"
                            : guest.guest_type === "companion"
                              ? "同伴者"
                              : "追加ゲスト"}
                        </Badge>
                        {guest.is_primary_payer && (
                          <Badge variant="outline">支払者</Badge>
                        )}
                        {guest.relationship_to_main && (
                          <span className="text-sm text-muted-foreground">
                            ({guest.relationship_to_main})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">小計</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(
                          calculateGuestTotal(guestOrders.get(guest.id) || [])
                        )}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {(guestOrders.get(guest.id) || []).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {order.order_item.product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                数量: {order.quantity_for_guest}
                              </span>
                              {order.is_shared_item && (
                                <Badge variant="secondary" className="text-xs">
                                  共有 ({order.shared_percentage}%)
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(order.amount_for_guest)}
                          </p>
                        </div>
                      ))}
                      {(guestOrders.get(guest.id) || []).length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          注文がありません
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* 商品選択モーダル */}
        <Dialog open={showProductSelect} onOpenChange={setShowProductSelect}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                商品選択 - {selectedGuest?.customer.name}
              </DialogTitle>
            </DialogHeader>
            {/* <ProductSelectModal
              onSelect={handleProductSelect}
              onClose={() => setShowProductSelect(false)}
            /> */}
            <div>商品選択機能は開発中です</div>
          </DialogContent>
        </Dialog>

        {/* 共有注文ダイアログ */}
        <Dialog open={showSharedOrder} onOpenChange={setShowSharedOrder}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>共有注文</DialogTitle>
            </DialogHeader>
            <SharedOrderDialog
              guests={guests}
              onConfirm={handleSharedOrder}
              onCancel={() => setShowSharedOrder(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
