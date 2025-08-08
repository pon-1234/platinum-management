"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { toast } from "sonner";
import type { VisitGuestWithCustomer } from "@/services/visit-guest.service";

interface GuestShare {
  guestId: string;
  percentage: number;
}

interface SharedOrderDialogProps {
  guests: VisitGuestWithCustomer[];
  onConfirm: (shares: GuestShare[]) => void;
  onCancel: () => void;
}

export function SharedOrderDialog({
  guests,
  onConfirm,
  onCancel,
}: SharedOrderDialogProps) {
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [guestShares, setGuestShares] = useState<Map<string, number>>(
    new Map()
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");

  const handleGuestToggle = (guestId: string, checked: boolean) => {
    const newSelected = new Set(selectedGuests);
    if (checked) {
      newSelected.add(guestId);
    } else {
      newSelected.delete(guestId);
    }
    setSelectedGuests(newSelected);

    // 均等分割の場合は自動計算
    if (splitMode === "equal" && newSelected.size > 0) {
      const equalShare = 100 / newSelected.size;
      const newShares = new Map<string, number>();
      newSelected.forEach((id) => {
        newShares.set(id, equalShare);
      });
      setGuestShares(newShares);
    }
  };

  const handleShareChange = (guestId: string, percentage: number) => {
    const newShares = new Map(guestShares);
    newShares.set(guestId, percentage);
    setGuestShares(newShares);
  };

  const handleSplitModeChange = (mode: "equal" | "custom") => {
    setSplitMode(mode);

    if (mode === "equal" && selectedGuests.size > 0) {
      const equalShare = 100 / selectedGuests.size;
      const newShares = new Map<string, number>();
      selectedGuests.forEach((id) => {
        newShares.set(id, equalShare);
      });
      setGuestShares(newShares);
    }
  };

  const handleConfirm = () => {
    if (selectedGuests.size === 0) {
      toast.error("少なくとも1名のゲストを選択してください");
      return;
    }

    const shares: GuestShare[] = [];
    let totalPercentage = 0;

    selectedGuests.forEach((guestId) => {
      const percentage = guestShares.get(guestId) || 0;
      shares.push({ guestId, percentage });
      totalPercentage += percentage;
    });

    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error("割合の合計は100%である必要があります");
      return;
    }

    onConfirm(shares);
  };

  const getTotalPercentage = () => {
    let total = 0;
    selectedGuests.forEach((id) => {
      total += guestShares.get(id) || 0;
    });
    return total;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>分割方法</Label>
        <Select
          value={splitMode}
          onValueChange={(v) => handleSplitModeChange(v as "equal" | "custom")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equal">均等分割</SelectItem>
            <SelectItem value="custom">カスタム分割</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>ゲスト選択と割合設定</Label>
        <div className="space-y-2">
          {guests.map((guest) => (
            <Card key={guest.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedGuests.has(guest.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      handleGuestToggle(guest.id, checked as boolean)
                    }
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{guest.customer.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {guest.guest_type === "main"
                        ? "主要"
                        : guest.guest_type === "companion"
                          ? "同伴"
                          : "追加"}
                    </Badge>
                  </div>
                  {selectedGuests.has(guest.id) && (
                    <div className="flex items-center gap-2 w-40">
                      {splitMode === "custom" ? (
                        <>
                          <Slider
                            value={[guestShares.get(guest.id) || 0]}
                            onValueChange={([value]) =>
                              handleShareChange(guest.id, value)
                            }
                            min={0}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-12 text-right">
                            {Math.round(guestShares.get(guest.id) || 0)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium">
                          {Math.round(guestShares.get(guest.id) || 0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm">
          合計:{" "}
          <span
            className={`font-bold ${Math.abs(getTotalPercentage() - 100) > 0.01 ? "text-destructive" : "text-green-600"}`}
          >
            {Math.round(getTotalPercentage())}%
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>確定</Button>
        </div>
      </div>
    </div>
  );
}
