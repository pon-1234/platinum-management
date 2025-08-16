"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function BulkDeleteModal() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const ids = useMemo(
    () => (sp.get("ids") || "").split(",").filter(Boolean).map(Number),
    [sp]
  );
  const [confirm, setConfirm] = useState("");

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  const handleApply = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      toast.success("選択した商品を削除しました");
      handleClose();
    } catch (e) {
      console.error(e);
      toast.error("削除に失敗しました");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[420px]"
      title="一括削除"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">一括削除</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-gray-600">対象: {ids.length} 商品</div>
        <p className="text-sm text-red-600">
          この操作は取り消せません。確認のため「DELETE」と入力してください。
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border rounded px-2 py-1"
          placeholder="DELETE"
        />
        <div className="pt-2 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="px-3 py-1.5 rounded text-white bg-red-600 disabled:opacity-50"
            onClick={handleApply}
            disabled={confirm !== "DELETE"}
          >
            削除する
          </button>
        </div>
      </div>
    </Drawer>
  );
}
