"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { customerService } from "@/services/customer.service";
import type { Customer, Visit } from "@/types/customer.types";
import { Drawer } from "@/components/ui/Drawer";
import { CustomerDetailClient } from "../../[id]/_components/CustomerDetailClient";

export default function CustomerDetailModal() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || "";
  const [open, setOpen] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const c = await customerService.getCustomerById(supabase, id);
        if (!c) {
          setError("顧客が見つかりません");
          return;
        }
        setCustomer(c);
        const result = await customerService.listCustomerVisits(supabase, id, {
          limit: 10,
          offset: 0,
        });
        setVisits(result.visits);
        setTotal(result.total);
      } catch (e) {
        setError("データの取得に失敗しました");
      }
    };
    load();
  }, [id]);

  const handleClose = () => {
    setOpen(false);
    // small delay to allow closing animation
    setTimeout(() => router.back(), 200);
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="right"
      widthClassName="sm:w-[720px]"
      title="顧客詳細"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">顧客詳細</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <CustomerDetailClient
          customer={customer}
          visits={visits}
          totalVisits={total}
          error={error}
        />
      </div>
    </Drawer>
  );
}
