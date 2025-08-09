"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import OrderAttributionEditor from "./OrderAttributionEditor";
import { formatCurrency } from "@/lib/utils/formatting";

interface OrderItemWithAttributionProps {
  orderItem: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    status: string;
  };
  visitId: string;
}

export default function OrderItemWithAttribution({
  orderItem,
  visitId,
}: OrderItemWithAttributionProps) {
  const [showAttribution, setShowAttribution] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{orderItem.product_name}</h4>
            <span className="text-sm text-gray-500">
              {orderItem.quantity} × {formatCurrency(orderItem.unit_price)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">
              ステータス: {orderItem.status}
            </span>
            <span className="font-semibold">
              {formatCurrency(orderItem.total_amount)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAttribution(!showAttribution)}
          className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="売上配分を表示"
        >
          {showAttribution ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {showAttribution && (
        <div className="mt-4 pt-4 border-t">
          <OrderAttributionEditor
            orderItemId={orderItem.id}
            visitId={visitId}
            totalAmount={orderItem.total_amount}
          />
        </div>
      )}
    </div>
  );
}
