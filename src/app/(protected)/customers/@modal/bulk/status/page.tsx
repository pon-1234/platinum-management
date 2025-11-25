"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function BulkCustomerStatusModal() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const ids = useMemo(
    () => (sp.get("ids") || "").split(",").filter(Boolean),
    [sp]
  );
  type CustomerStatus = "active" | "vip" | "blocked";
  const [status, setStatus] = useState<CustomerStatus>("active");

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  const handleApply = async () => {
    try {
      const supabase = createClient();
      // apply updates sequentially
      for (const id of ids) {
        const { error } = await supabase
          .from("customers")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }
      toast.success("一括ステータス変更を適用しました");
      handleClose();
    } catch (e) {
      console.error(e);
      toast.error("一括ステータス変更に失敗しました");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[420px]"
      title="一括ステータス変更"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">一括ステータス変更</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-gray-600">対象: {ids.length} 顧客</div>
        <div>
          <label className="block text-sm font-medium mb-1">ステータス</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerStatus)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="active">通常</option>
            <option value="vip">VIP</option>
            <option value="blocked">ブロック</option>
          </select>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="px-3 py-1.5 rounded text-white bg-indigo-600"
            onClick={handleApply}
          >
            適用
          </button>
        </div>
      </div>
    </Drawer>
  );
}
