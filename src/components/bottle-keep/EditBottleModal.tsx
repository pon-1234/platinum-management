"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BottleKeep,
  UpdateBottleKeepInput,
} from "@/services/bottle-keep.service";
import { Wine, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditBottleModalProps {
  bottle: BottleKeep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: UpdateBottleKeepInput) => Promise<void>;
  staffs?: Array<{ id: string; full_name: string }>;
}

export function EditBottleModal({
  bottle,
  open,
  onOpenChange,
  onUpdate,
  staffs = [],
}: EditBottleModalProps) {
  const [formData, setFormData] = useState<UpdateBottleKeepInput>({
    storage_location: "",
    table_number: "",
    host_staff_id: "",
    notes: "",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bottle) {
      setFormData({
        storage_location: bottle.storage_location || "",
        table_number: bottle.table_number || "",
        host_staff_id: bottle.host_staff_id || "",
        notes: bottle.notes || "",
        status: bottle.status,
      });
    }
  }, [bottle]);

  if (!bottle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updateData: UpdateBottleKeepInput = {};

      // 変更されたフィールドのみを送信
      if (formData.storage_location !== bottle.storage_location) {
        updateData.storage_location = formData.storage_location || undefined;
      }
      if (formData.table_number !== bottle.table_number) {
        updateData.table_number = formData.table_number || undefined;
      }
      if (formData.host_staff_id !== bottle.host_staff_id) {
        updateData.host_staff_id = formData.host_staff_id || undefined;
      }
      if (formData.notes !== bottle.notes) {
        updateData.notes = formData.notes || undefined;
      }
      if (formData.status !== bottle.status) {
        updateData.status = formData.status;
      }

      await onUpdate(bottle.id, updateData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5" />
            ボトル情報編集
          </DialogTitle>
          <DialogDescription>
            {bottle.product?.name} ({bottle.bottle_number})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>顧客</Label>
            <div className="text-sm bg-gray-50 p-2 rounded">
              {bottle.customer?.name}
              {bottle.customer?.phone_number && (
                <span className="text-muted-foreground ml-2">
                  ({bottle.customer.phone_number})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage-location">保管場所</Label>
              <Input
                id="storage-location"
                value={formData.storage_location}
                onChange={(e) =>
                  setFormData({ ...formData, storage_location: e.target.value })
                }
                placeholder="例: 冷蔵庫A-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-number">テーブル番号</Label>
              <Input
                id="table-number"
                value={formData.table_number}
                onChange={(e) =>
                  setFormData({ ...formData, table_number: e.target.value })
                }
                placeholder="例: T-01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host-staff">担当スタッフ</Label>
            <Select
              value={formData.host_staff_id}
              onValueChange={(value) =>
                setFormData({ ...formData, host_staff_id: value })
              }
            >
              <SelectTrigger id="host-staff">
                <SelectValue placeholder="担当スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未設定</SelectItem>
                {staffs.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">ステータス</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">利用可能</SelectItem>
                <SelectItem value="consumed">消費済み</SelectItem>
                <SelectItem value="expired">期限切れ</SelectItem>
                <SelectItem value="removed">削除済み</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="ボトルに関する備考を入力してください"
              className="min-h-[100px]"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "更新中..." : "更新する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
