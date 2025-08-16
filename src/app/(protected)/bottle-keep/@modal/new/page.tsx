"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BottleKeepForm } from "@/components/bottle-keep/BottleKeepForm";

export default function NewBottleKeepDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

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
      title="ボトルキープ新規登録"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">ボトルキープ新規登録</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <BottleKeepForm onSubmit={async () => handleClose()} />
      </div>
    </Drawer>
  );
}
