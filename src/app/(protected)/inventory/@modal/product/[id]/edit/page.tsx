"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { ProductFormModal } from "@/app/(protected)/inventory/components/ProductFormModal";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types/inventory.types";

export default function EditProductModal() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(params?.id as string);
  const [open, setOpen] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      setProduct(data);
    })();
  }, [productId]);

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
      title="商品編集"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">商品編集</h3>
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
          product={product}
          categories={[]}
          onClose={handleClose}
        />
      </div>
    </Drawer>
  );
}
