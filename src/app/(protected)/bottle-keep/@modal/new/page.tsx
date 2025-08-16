"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BottleKeepForm } from "@/components/bottle-keep/BottleKeepForm";
import { Access } from "@/components/auth/Access";
import { toast } from "react-hot-toast";
import { createBottleKeep } from "@/app/actions/bottle-keep.actions";
import { getProducts } from "@/app/actions/inventory.actions";
import { searchCustomers } from "@/app/actions/customer.actions";
import { getStorageLocations } from "@/app/actions/bottle-keep.actions";

export default function NewBottleKeepDrawer() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string; phone_number?: string }>
  >([]);
  const [products, setProducts] = useState<
    Array<{ id: number; name: string; category: string; price: number }>
  >([]);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [customersRes, productsRes, locationsRes] = await Promise.all([
          searchCustomers({ limit: 50, offset: 0 }),
          getProducts({}),
          getStorageLocations({}),
        ]);
        if (customersRes.success) setCustomers(customersRes.data as any);
        if (productsRes.success) setProducts(productsRes.data as any);
        if (locationsRes.success) setStorageLocations(locationsRes.data as any);
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.error(e);
        toast.error("初期データの読み込みに失敗しました");
      }
    })();
  }, []);

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
        <Access
          roles={["admin", "manager", "hall", "cashier"]}
          resource="bottle_keep"
          action="manage"
          require="any"
          fallback={<div className="p-4">権限がありません。</div>}
        >
          <BottleKeepForm
            customers={customers}
            products={products}
            storageLocations={storageLocations}
            loading={loading}
            onSubmit={async (form) => {
              setLoading(true);
              try {
                const result = await createBottleKeep({
                  customerId: form.customerId,
                  productId: form.productId,
                  openedDate: form.openedDate,
                  expiryDate: form.expiryDate,
                  bottleNumber: form.bottleNumber,
                  storageLocation: form.storageLocation,
                  notes: form.notes,
                });
                if (result.success) {
                  toast.success("ボトルキープを登録しました");
                  router.refresh();
                  handleClose();
                } else {
                  toast.error(result.error || "登録に失敗しました");
                }
              } finally {
                setLoading(false);
              }
            }}
            onCancel={handleClose}
          />
        </Access>
      </div>
    </Drawer>
  );
}
