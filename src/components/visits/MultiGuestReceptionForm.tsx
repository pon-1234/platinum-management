"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Users, User, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { VisitGuestService } from "@/lib/services/visit-guest.service";
import type { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];

interface GuestFormData {
  customerId?: string;
  customer?: Customer;
  name?: string;
  phone?: string;
  guestType: "main" | "companion" | "additional";
  seatPosition?: number;
  relationshipToMain?: string;
  isPrimaryPayer: boolean;
}

interface MultiGuestReceptionFormProps {
  visitId: string;
  customers: Customer[];
  onGuestsAdded?: (guests: VisitGuest[]) => void;
  onClose?: () => void;
}

export function MultiGuestReceptionForm({
  visitId,
  customers,
  onGuestsAdded,
  onClose,
}: MultiGuestReceptionFormProps) {
  const [guests, setGuests] = useState<GuestFormData[]>([
    {
      guestType: "main",
      isPrimaryPayer: true,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addGuest = () => {
    setGuests([
      ...guests,
      {
        guestType: "companion",
        isPrimaryPayer: false,
        seatPosition: guests.length + 1,
      },
    ]);
  };

  const removeGuest = (index: number) => {
    if (guests[index].guestType === "main") {
      toast.error("主要顧客は削除できません");
      return;
    }
    setGuests(guests.filter((_, i) => i !== index));
  };

  const updateGuest = (index: number, updates: Partial<GuestFormData>) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], ...updates };

    // 主要支払者が変更された場合、他をリセット
    if (updates.isPrimaryPayer === true) {
      newGuests.forEach((g, i) => {
        if (i !== index) g.isPrimaryPayer = false;
      });
    }

    setGuests(newGuests);
  };

  const handleCustomerSelect = (index: number, customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      updateGuest(index, {
        customerId,
        customer,
        name: customer.name,
        phone: customer.phone_number || undefined,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // バリデーション
      const mainGuest = guests.find((g) => g.guestType === "main");
      if (!mainGuest || (!mainGuest.customerId && !mainGuest.name)) {
        toast.error("主要顧客を選択または入力してください");
        return;
      }

      const addedGuests: VisitGuest[] = [];

      for (const guest of guests) {
        const result = await VisitGuestService.addGuestToVisit(
          visitId,
          {
            customerId: guest.customerId,
            name: guest.name,
            phone: guest.phone,
          },
          guest.guestType,
          {
            seat_position: guest.seatPosition,
            relationship_to_main: guest.relationshipToMain,
            is_primary_payer: guest.isPrimaryPayer,
          }
        );
        addedGuests.push(result);
      }

      toast.success(`${addedGuests.length}名のゲストを登録しました`);
      onGuestsAdded?.(addedGuests);
      onClose?.();
    } catch (error) {
      console.error("Error adding guests:", error);
      toast.error("ゲストの登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGuestTypeLabel = (type: string) => {
    switch (type) {
      case "main":
        return "主要顧客";
      case "companion":
        return "同伴者";
      case "additional":
        return "追加ゲスト";
      default:
        return type;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          複数ゲスト登録
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {guests.map((guest, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={
                      guest.guestType === "main" ? "default" : "secondary"
                    }
                  >
                    {getGuestTypeLabel(guest.guestType)}
                  </Badge>
                  {guest.isPrimaryPayer && (
                    <Badge variant="outline" className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      支払者
                    </Badge>
                  )}
                </div>
                {guest.guestType !== "main" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuest(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>顧客選択</Label>
                  <Select
                    value={guest.customerId || ""}
                    onValueChange={(value) =>
                      handleCustomerSelect(index, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="既存顧客から選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">新規顧客</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}{" "}
                          {customer.phone_number &&
                            `(${customer.phone_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!guest.customerId && (
                  <>
                    <div className="space-y-2">
                      <Label>名前</Label>
                      <Input
                        value={guest.name || ""}
                        onChange={(e) =>
                          updateGuest(index, { name: e.target.value })
                        }
                        placeholder="名前を入力"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>電話番号</Label>
                      <Input
                        value={guest.phone || ""}
                        onChange={(e) =>
                          updateGuest(index, { phone: e.target.value })
                        }
                        placeholder="電話番号を入力"
                      />
                    </div>
                  </>
                )}

                {guest.guestType !== "main" && (
                  <>
                    <div className="space-y-2">
                      <Label>主要顧客との関係</Label>
                      <Select
                        value={guest.relationshipToMain || ""}
                        onValueChange={(value) =>
                          updateGuest(index, { relationshipToMain: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="関係性を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="友人">友人</SelectItem>
                          <SelectItem value="同僚">同僚</SelectItem>
                          <SelectItem value="部下">部下</SelectItem>
                          <SelectItem value="上司">上司</SelectItem>
                          <SelectItem value="取引先">取引先</SelectItem>
                          <SelectItem value="その他">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>席順</Label>
                      <Input
                        type="number"
                        min="1"
                        value={guest.seatPosition || ""}
                        onChange={(e) =>
                          updateGuest(index, {
                            seatPosition: parseInt(e.target.value) || undefined,
                          })
                        }
                        placeholder="席順"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`primary-payer-${index}`}
                    checked={guest.isPrimaryPayer}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      updateGuest(index, { isPrimaryPayer: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor={`primary-payer-${index}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    主要支払者として設定
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addGuest} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          ゲストを追加
        </Button>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "登録中..." : `${guests.length}名を登録`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
