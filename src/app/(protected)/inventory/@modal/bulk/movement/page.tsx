"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { createClient } from "@/lib/supabase/client";
import { Access } from "@/components/auth/Access";
import { toast } from "react-hot-toast";

export default function BulkMovementModal() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const ids = useMemo(
    () => (sp.get("ids") || "").split(",").filter(Boolean).map(Number),
    [sp]
  );
  const [quantity, setQuantity] = useState<number>(0);
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [reason, setReason] = useState<string>("");

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  const handleApply = async () => {
    try {
      const supabase = createClient();
      // Apply movement one by one (simple, can be optimized with RPC later)
      for (const productId of ids) {
        const { error } = await supabase.rpc(
          "create_inventory_movement_with_stock_update",
          {
            p_product_id: productId,
            p_movement_type: movementType,
            p_quantity: quantity,
            p_unit_cost: null,
            p_reason: reason || null,
            p_reference_id: null,
          }
        );
        if (error) throw error;
      }
      toast.success("一括在庫調整を適用しました");
      handleClose();
    } catch (e) {
      console.error(e);
      toast.error("一括在庫調整に失敗しました");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[520px]"
      title="一括在庫調整"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">一括在庫調整</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <Access
        roles={["admin", "manager"]}
        resource="inventory"
        action="manage"
        require="any"
        fallback={
          <div className="p-4 text-sm text-gray-600">権限がありません。</div>
        }
      >
        <div className="p-4 space-y-3">
          <div className="text-sm text-gray-600">対象: {ids.length} 商品</div>
          <div>
            <label className="block text-sm font-medium mb-1">区分</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMovementType("in")}
                className={`px-3 py-1.5 rounded border ${movementType === "in" ? "bg-green-50 border-green-400" : "bg-white"}`}
              >
                入庫
              </button>
              <button
                onClick={() => setMovementType("out")}
                className={`px-3 py-1.5 rounded border ${movementType === "out" ? "bg-red-50 border-red-400" : "bg-white"}`}
              >
                出庫
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">数量</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border rounded px-2 py-1"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              理由（任意）
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded px-2 py-1"
              rows={2}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              className="px-3 py-1.5 rounded border"
              onClick={handleClose}
            >
              キャンセル
            </button>
            <button
              className="px-3 py-1.5 rounded text-white bg-indigo-600"
              onClick={handleApply}
              disabled={quantity <= 0}
            >
              適用
            </button>
          </div>
        </div>
      </Access>
    </Drawer>
  );
}
