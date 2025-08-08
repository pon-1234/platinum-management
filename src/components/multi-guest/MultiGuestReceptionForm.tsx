"use client";

import React, { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Users } from "lucide-react";
import { Database } from "@/types/database.types";
import { VisitGuestService } from "@/services/visitGuestService";
import { createClient } from "@/lib/supabase/client";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];

interface GuestInput {
  customerId?: string;
  customerName?: string;
  guestType: "main" | "companion" | "additional";
  seatPosition?: number;
  relationshipToMain?: string;
  isPrimaryPayer: boolean;
  isNewCustomer: boolean;
}

interface MultiGuestReceptionFormProps {
  visitId?: string;
  onGuestsAdded?: (guests: VisitGuest[]) => void;
  onClose?: () => void;
}

export function MultiGuestReceptionForm({
  visitId,
  onGuestsAdded,
  onClose,
}: MultiGuestReceptionFormProps) {
  const [guests, setGuests] = useState<GuestInput[]>([
    {
      guestType: "main",
      isPrimaryPayer: true,
      isNewCustomer: false,
    },
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");

    if (data && !error) {
      setCustomers(data);
    }
  };

  const addGuest = () => {
    setGuests([
      ...guests,
      {
        guestType: "companion",
        isPrimaryPayer: false,
        isNewCustomer: false,
      },
    ]);
  };

  const removeGuest = (index: number) => {
    if (guests[index].guestType === "main") return;

    const newGuests = guests.filter((_, i) => i !== index);
    // Recalculate seat positions
    newGuests.forEach((guest, i) => {
      guest.seatPosition = i + 1;
    });
    setGuests(newGuests);
  };

  const updateGuest = (index: number, updates: Partial<GuestInput>) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], ...updates };

    // If setting as primary payer, unset others
    if (updates.isPrimaryPayer) {
      newGuests.forEach((guest, i) => {
        if (i !== index) {
          guest.isPrimaryPayer = false;
        }
      });
    }

    setGuests(newGuests);
  };

  const handleSubmit = async () => {
    if (!visitId) return;

    setLoading(true);
    const addedGuests: VisitGuest[] = [];

    try {
      for (const [index, guest] of guests.entries()) {
        let customerId = guest.customerId;

        // Create new customer if needed
        if (guest.isNewCustomer && guest.customerName) {
          const supabase = createClient();
          const { data: newCustomer, error } = await supabase
            .from("customers")
            .insert({
              name: guest.customerName,
              status: "active",
            })
            .select()
            .single();

          if (error) {
            console.error("Error creating customer:", error);
            continue;
          }

          customerId = newCustomer.id;
        }

        if (!customerId) continue;

        // Add guest to visit
        const addedGuest = await VisitGuestService.addGuestToVisit(
          visitId,
          customerId,
          guest.guestType,
          {
            seat_position: index + 1,
            relationship_to_main: guest.relationshipToMain,
            is_primary_payer: guest.isPrimaryPayer,
          }
        );

        if (addedGuest) {
          addedGuests.push(addedGuest);
        }
      }

      if (onGuestsAdded) {
        onGuestsAdded(addedGuests);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error adding guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          複数ゲスト登録
        </CardTitle>
        <CardDescription>来店されたお客様を登録してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {guests.map((guest, index) => (
          <Card key={index} className="relative">
            <CardContent className="pt-6">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <Badge
                  variant={guest.guestType === "main" ? "default" : "secondary"}
                >
                  {guest.guestType === "main"
                    ? "主要顧客"
                    : guest.guestType === "companion"
                      ? "同伴者"
                      : "追加"}
                </Badge>
                {guest.isPrimaryPayer && (
                  <Badge variant="destructive">支払者</Badge>
                )}
                {guest.guestType !== "main" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeGuest(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>顧客タイプ</Label>
                  <Select
                    value={guest.guestType}
                    onValueChange={(value) =>
                      updateGuest(index, {
                        guestType: value as "main" | "companion" | "additional",
                      })
                    }
                    disabled={index === 0}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">主要顧客</SelectItem>
                      <SelectItem value="companion">同伴者</SelectItem>
                      <SelectItem value="additional">追加</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>顧客選択</Label>
                  {guest.isNewCustomer ? (
                    <Input
                      placeholder="新規顧客名"
                      value={guest.customerName || ""}
                      onChange={(e) =>
                        updateGuest(index, { customerName: e.target.value })
                      }
                    />
                  ) : (
                    <Select
                      value={guest.customerId}
                      onValueChange={(value) =>
                        updateGuest(index, { customerId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="顧客を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredCustomers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`new-customer-${index}`}
                      checked={guest.isNewCustomer}
                      onChange={(e) =>
                        updateGuest(index, { isNewCustomer: e.target.checked })
                      }
                    />
                    <Label htmlFor={`new-customer-${index}`}>新規顧客</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`primary-payer-${index}`}
                      checked={guest.isPrimaryPayer}
                      onChange={(e) =>
                        updateGuest(index, { isPrimaryPayer: e.target.checked })
                      }
                    />
                    <Label htmlFor={`primary-payer-${index}`}>支払担当</Label>
                  </div>
                </div>

                {guest.guestType !== "main" && (
                  <div className="space-y-2 col-span-2">
                    <Label>主要顧客との関係</Label>
                    <Input
                      placeholder="例: 友人、同僚、部下"
                      value={guest.relationshipToMain || ""}
                      onChange={(e) =>
                        updateGuest(index, {
                          relationshipToMain: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={addGuest} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          ゲストを追加
        </Button>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !visitId}>
            {loading ? "登録中..." : "ゲストを登録"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
