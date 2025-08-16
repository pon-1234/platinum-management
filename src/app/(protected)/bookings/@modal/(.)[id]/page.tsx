"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { ReservationDetailModal } from "@/components/reservation/ReservationDetailModal";
import { reservationService } from "@/services/reservation.service";
import type { ReservationWithDetails } from "@/types/reservation.types";

export default function ReservationDrawer() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [open, setOpen] = useState(true);
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await reservationService.getReservationWithDetails(id);
        setReservation(data);
      } catch {
        setReservation(null);
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
      title="予約詳細"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">予約詳細</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <ReservationDetailModal
          reservation={reservation}
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleClose}
        />
      </div>
    </Drawer>
  );
}
