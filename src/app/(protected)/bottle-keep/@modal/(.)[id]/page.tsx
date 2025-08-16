"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BottleKeepForm } from "@/components/bottle-keep/BottleKeepForm";
import { BottleKeepService } from "@/services/bottle-keep.service";
import type { BottleKeep } from "@/services/bottle-keep.service";

export default function BottleKeepDrawer() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [open, setOpen] = useState(true);
  const [bottleKeep, setBottleKeep] = useState<BottleKeep | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await BottleKeepService.getBottleKeep(id);
        setBottleKeep(data as any);
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
        <BottleKeepForm
          bottleKeep={bottleKeep as any}
          onSubmit={async (_data) => handleClose()}
          onCancel={handleClose}
        />
      </div>
    </Drawer>
  );
}
