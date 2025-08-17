"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { VisitWithDetails } from "@/types/billing.types";
import { PRICING_TABLE, quoteSession } from "@/services/billing.service";
import { billingService } from "@/services/billing.service";
import { toast } from "react-hot-toast";

type SeatPlan = "BAR" | "COUNTER" | "VIP_A" | "VIP_B";

export interface QuotePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: VisitWithDetails;
}

export default function QuotePreviewModal({
  isOpen,
  onClose,
  visit,
}: QuotePreviewModalProps) {
  const [plan, setPlan] = useState<SeatPlan>("BAR");
  const [useRoom, setUseRoom] = useState<boolean>(false);
  const [nominationCount, setNominationCount] = useState<number>(0);
  const [inhouseCount, setInhouseCount] = useState<number>(0);
  const [applyHouseFee, setApplyHouseFee] = useState<boolean>(false);
  const [applySingleCharge, setApplySingleCharge] = useState<boolean>(false);
  const [drinkTotal, setDrinkTotal] = useState<number>(0);
  const [serviceRate, setServiceRate] = useState<number>(0.1);
  const [taxRate, setTaxRate] = useState<number>(0.1);

  const startAt = visit.checkInAt;
  const endAt = visit.checkOutAt || new Date().toISOString();

  const quote = useMemo(() => {
    try {
      return quoteSession({
        plan,
        startAt,
        endAt,
        useRoom,
        nominationCount,
        inhouseCount,
        applyHouseFee,
        applySingleCharge,
        drinkTotal,
        // Prefer split rates
        serviceRate,
        taxRate,
      });
    } catch {
      return null;
    }
  }, [
    plan,
    startAt,
    endAt,
    useRoom,
    nominationCount,
    inhouseCount,
    applyHouseFee,
    applySingleCharge,
    drinkTotal,
  ]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="見積りプレビュー">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>プラン</Label>
            <select
              className="w-full border rounded px-2 py-1"
              value={plan}
              onChange={(e) => setPlan(e.target.value as SeatPlan)}
            >
              {Object.keys(PRICING_TABLE).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <input
              id="use-room"
              type="checkbox"
              className="h-4 w-4"
              checked={useRoom}
              onChange={(e) => setUseRoom(e.target.checked)}
            />
            <Label htmlFor="use-room">ROOM 利用</Label>
          </div>

          <div>
            <Label>指名数</Label>
            <Input
              type="number"
              min={0}
              value={nominationCount}
              onChange={(e) =>
                setNominationCount(Math.max(0, Number(e.target.value || 0)))
              }
            />
          </div>
          <div>
            <Label>場内数</Label>
            <Input
              type="number"
              min={0}
              value={inhouseCount}
              onChange={(e) =>
                setInhouseCount(Math.max(0, Number(e.target.value || 0)))
              }
            />
          </div>

          <div className="flex items-end gap-2">
            <input
              id="house-fee"
              type="checkbox"
              className="h-4 w-4"
              checked={applyHouseFee}
              onChange={(e) => setApplyHouseFee(e.target.checked)}
            />
            <Label htmlFor="house-fee">ハウス料</Label>
          </div>
          <div className="flex items-end gap-2">
            <input
              id="single-charge"
              type="checkbox"
              className="h-4 w-4"
              checked={applySingleCharge}
              onChange={(e) => setApplySingleCharge(e.target.checked)}
            />
            <Label htmlFor="single-charge">シングルチャージ</Label>
          </div>

          <div>
            <Label>ドリンク合計（円）</Label>
            <Input
              type="number"
              min={0}
              value={drinkTotal}
              onChange={(e) =>
                setDrinkTotal(Math.max(0, Number(e.target.value || 0)))
              }
            />
          </div>
          <div>
            <Label>サービス料率</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={serviceRate}
              onChange={(e) =>
                setServiceRate(
                  Math.max(0, Math.min(1, Number(e.target.value || 0)))
                )
              }
            />
          </div>
          <div>
            <Label>税率</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={taxRate}
              onChange={(e) =>
                setTaxRate(
                  Math.max(0, Math.min(1, Number(e.target.value || 0)))
                )
              }
            />
          </div>
          <div>
            <Label>滞在分数</Label>
            <div className="px-2 py-1 border rounded bg-gray-50">
              {quote?.stayMinutes ?? "-"} 分
            </div>
          </div>
        </div>

        <div className="border rounded">
          <div className="grid grid-cols-12 px-3 py-2 text-gray-500 bg-gray-50">
            <div className="col-span-6">項目</div>
            <div className="col-span-2 text-right">単価</div>
            <div className="col-span-2 text-right">数量</div>
            <div className="col-span-2 text-right">金額</div>
          </div>
          <div className="divide-y">
            {quote?.lines.map((l) => (
              <div
                key={l.code + String(l.quantity)}
                className="grid grid-cols-12 px-3 py-2"
              >
                <div className="col-span-6 truncate" title={l.label}>
                  {l.label}
                </div>
                <div className="col-span-2 text-right">
                  ¥{l.unitPrice.toLocaleString()}
                </div>
                <div className="col-span-2 text-right">{l.quantity}</div>
                <div className="col-span-2 text-right font-medium">
                  ¥{l.amount.toLocaleString()}
                </div>
              </div>
            ))}
            {(!quote || quote.lines.length === 0) && (
              <div className="px-3 py-6 text-center text-gray-400">
                内訳なし
              </div>
            )}
          </div>
          <div className="px-3 py-2 bg-gray-50 space-y-1">
            <div className="flex justify-between text-sm">
              <span>小計</span>
              <span>¥{(quote?.subtotal ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>サービス料</span>
              <span>¥{(quote?.serviceAmount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>税額</span>
              <span>¥{(quote?.taxAmount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>サービス料＋税</span>
              <span>¥{(quote?.serviceTax ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>合計</span>
              <span>¥{(quote?.total ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button
            onClick={async () => {
              if (!quote) return;
              try {
                await billingService.applyQuoteToVisit(visit.id, quote);
                toast.success("見積りを明細へ反映しました");
                onClose();
              } catch (e) {
                toast.error("反映に失敗しました");
              }
            }}
          >
            伝票に反映
          </Button>
        </div>
      </div>
    </Modal>
  );
}
