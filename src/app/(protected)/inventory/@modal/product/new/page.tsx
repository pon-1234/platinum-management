"use client";

import { Drawer } from "@/components/ui/Drawer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductFormModal } from "../../components/ProductFormModal";

export default function NewProductModal() {
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
      widthClassName="sm:w-[640px]"
      title="商品追加"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">商品追加</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <ProductFormModal
          product={null}
          categories={[]}
          onClose={handleClose}
        />
      </div>
    </Drawer>
  );
}
