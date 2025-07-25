"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import {
  createInventoryMovement,
  adjustInventory,
  type CreateInventoryMovementInput,
  type AdjustInventoryInput,
} from "@/app/actions/inventory.actions";
import type { Product } from "@/types/inventory.types";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface InventoryMovementModalProps {
  product: Product;
  onClose: () => void;
}

export function InventoryMovementModal({
  product,
  onClose,
}: InventoryMovementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movementType, setMovementType] = useState<"in" | "out" | "adjustment">(
    "in"
  );
  const [quantity, setQuantity] = useState(0);
  const [adjustedStock, setAdjustedStock] = useState(product.stock_quantity);
  const [unitCost, setUnitCost] = useState(product.cost);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (movementType === "adjustment") {
        // Handle inventory adjustment
        const adjustmentData: AdjustInventoryInput = {
          productId: product.id,
          currentStock: product.stock_quantity,
          adjustedStock: adjustedStock,
          reason: reason || "在庫調整",
        };
        const result = await adjustInventory(adjustmentData);
        if (result.success) {
          toast.success("在庫を調整しました");
          onClose();
        } else {
          toast.error("在庫調整に失敗しました");
        }
      } else {
        // Handle regular inventory movement
        const movementData: CreateInventoryMovementInput = {
          productId: product.id,
          movementType,
          quantity,
          unitCost: movementType === "in" ? unitCost : undefined,
          reason: reason || undefined,
        };
        const result = await createInventoryMovement(movementData);
        if (result.success) {
          toast.success(
            movementType === "in" ? "入庫を記録しました" : "出庫を記録しました"
          );
          onClose();
        } else {
          toast.error("在庫変動の記録に失敗しました");
        }
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNewStockQuantity = () => {
    if (movementType === "in") {
      return product.stock_quantity + quantity;
    } else if (movementType === "out") {
      return product.stock_quantity - quantity;
    } else {
      return adjustedStock;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="在庫変動記録">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500">
            現在庫数: {product.stock_quantity}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            変動タイプ
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setMovementType("in")}
              className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-1 ${
                movementType === "in"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300"
              }`}
            >
              <ArrowUpIcon className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">入庫</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementType("out")}
              className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-1 ${
                movementType === "out"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
              }`}
            >
              <ArrowDownIcon className="h-6 w-6 text-red-600" />
              <span className="text-sm font-medium">出庫</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementType("adjustment")}
              className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-1 ${
                movementType === "adjustment"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
            >
              <ArrowPathIcon className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">調整</span>
            </button>
          </div>
        </div>

        {movementType !== "adjustment" ? (
          <>
            <Input
              label="数量"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              max={movementType === "out" ? product.stock_quantity : undefined}
              required
            />

            {movementType === "in" && (
              <Input
                label="単価"
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                min="0"
                required
              />
            )}
          </>
        ) : (
          <Input
            label="調整後在庫数"
            type="number"
            value={adjustedStock}
            onChange={(e) => setAdjustedStock(Number(e.target.value))}
            min="0"
            required
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            理由・備考（任意）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={
              movementType === "in"
                ? "例: 定期発注、追加仕入れ"
                : movementType === "out"
                  ? "例: 販売、破損・廃棄"
                  : "例: 棚卸し結果、誤差修正"
            }
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              変動後在庫数:
            </span>
            <span
              className={`text-lg font-bold ${
                getNewStockQuantity() < 0
                  ? "text-red-600"
                  : getNewStockQuantity() <= product.low_stock_threshold
                    ? "text-yellow-600"
                    : "text-green-600"
              }`}
            >
              {getNewStockQuantity()}
            </span>
          </div>
          {getNewStockQuantity() < 0 && (
            <p className="text-sm text-red-600 mt-2">
              在庫数がマイナスになります。数量を確認してください。
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (movementType === "out" && getNewStockQuantity() < 0)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "処理中..." : "記録"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
