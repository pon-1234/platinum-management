"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BottleKeepForm } from "@/components/bottle-keep/BottleKeepForm";
import { BottleKeepService } from "@/services/bottle-keep.service";
import type { BottleKeepDetail } from "@/types/bottle-keep.types";
import { Access } from "@/components/auth/Access";
import { toast } from "react-hot-toast";
import { updateBottleKeep } from "@/app/actions/bottle-keep.actions";

export default function BottleKeepDrawer() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [open, setOpen] = useState(true);
  const [bottleKeep, setBottleKeep] = useState<BottleKeepDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await BottleKeepService.getBottleKeep(id);
        if (data) {
          setBottleKeep({
            ...(data as unknown as BottleKeepDetail),
            product_id: Number(data.product_id),
            remaining_amount:
              (data as { remaining_amount?: number }).remaining_amount ??
              (data as { remaining_percentage?: number })
                .remaining_percentage ??
              0,
            bottle_number: data.bottle_number || "",
          });
        } else {
          setBottleKeep(null);
        }
      } catch {
        setBottleKeep(null);
      }
    })();
  }, [id]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[720px]"
      title="ボトルキープ編集"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">ボトルキープ編集</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <Access
          roles={["admin", "manager", "hall", "cashier"]}
          resource="bottle_keep"
          action="manage"
          require="any"
          fallback={<div className="p-4">権限がありません。</div>}
        >
          <BottleKeepForm
            bottleKeep={bottleKeep}
            onSubmit={async (_form) => {
              if (!bottleKeep) return;
              try {
                const res = await updateBottleKeep({
                  id: bottleKeep.id,
                  status: undefined,
                  storageLocation: _form.storageLocation,
                  expiryDate: _form.expiryDate,
                  remainingAmount: undefined,
                  notes: _form.notes,
                });
                if (res.success) {
                  toast.success("ボトルキープを更新しました");
                  handleClose();
                } else {
                  toast.error(res.error || "更新に失敗しました");
                }
              } catch (e) {
                toast.error("更新に失敗しました");
              }
            }}
            onCancel={handleClose}
          />
        </Access>
      </div>
    </Drawer>
  );
}
