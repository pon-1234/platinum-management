"use client";

import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { BottleKeep } from "@/services/bottle-keep.service";
import { Wine, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServeBottleModalProps {
  bottle: BottleKeep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServe: (data: {
    bottle_keep_id: string;
    served_amount: number;
    notes?: string;
  }) => Promise<void>;
}

export function ServeBottleModal({
  bottle,
  open,
  onOpenChange,
  onServe,
}: ServeBottleModalProps) {
  const [servedAmount, setServedAmount] = useState<number>(0.1);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bottle) return null;

  const remainingAfter = Math.max(
    0,
    bottle.remaining_percentage - servedAmount
  );
  const willBeConsumed = remainingAfter === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onServe({
        bottle_keep_id: bottle.id,
        served_amount: servedAmount,
        notes: notes || undefined,
      });

      // リセット
      setServedAmount(0.1);
      setNotes("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提供に失敗しました");
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
            ボトル提供
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

          <div className="space-y-2">
            <Label>現在の残量</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{ width: `${bottle.remaining_percentage * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(bottle.remaining_percentage * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="served-amount">
              提供量: {Math.round(servedAmount * 100)}%
            </Label>
            <Slider
              id="served-amount"
              min={1}
              max={Math.min(100, bottle.remaining_percentage * 100)}
              step={1}
              value={[servedAmount * 100]}
              onValueChange={(value) => setServedAmount(value[0] / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>{Math.round(bottle.remaining_percentage * 100)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>提供後の残量</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    willBeConsumed
                      ? "bg-red-500"
                      : remainingAfter < 0.3
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${remainingAfter * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(remainingAfter * 100)}%
              </span>
            </div>
          </div>

          {willBeConsumed && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                このボトルは完全に消費され、ステータスが「消費済み」に変更されます
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">備考（任意）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="提供に関する備考があれば入力してください"
              className="min-h-[80px]"
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
              {loading ? "処理中..." : "提供する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
