"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { CreateReservationModal } from "@/components/reservation/CreateReservationModal";

export default function NewReservationDrawer() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const date = sp.get("date") || undefined;

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[680px]"
      title="新規予約"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">新規予約</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <CreateReservationModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleClose}
          initialDate={date}
        />
      </div>
    </Drawer>
  );
}
