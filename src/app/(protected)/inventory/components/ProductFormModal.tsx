"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import {
  createProduct,
  updateProduct,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/app/actions/inventory.actions";
import type { Product } from "@/types/inventory.types";

interface ProductFormModalProps {
  product: Product | null;
  categories: string[];
  onClose: () => void;
}

export function ProductFormModal({
  product,
  categories,
  onClose,
}: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || "",
    category: product?.category || "",
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock_quantity: product?.stock_quantity || 0,
    low_stock_threshold: product?.low_stock_threshold || 10,
    reorder_point: product?.reorder_point || 15,
    max_stock: product?.max_stock || 100,
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const category = showNewCategory ? newCategory : formData.category;

      if (product) {
        // Update existing product
        const updateData: UpdateProductInput = {
          id: product.id,
          ...formData,
          category,
        };
        const result = await updateProduct(updateData);
        if (result.success) {
          toast.success("商品を更新しました");
          onClose();
        } else {
          toast.error("商品の更新に失敗しました");
        }
      } else {
        // Create new product
        const createData: CreateProductInput = {
          ...formData,
          category,
        };
        const result = await createProduct(createData);
        if (result.success) {
          toast.success("商品を追加しました");
          onClose();
        } else {
          toast.error("商品の追加に失敗しました");
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "category" ? value : Number(value),
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={product ? "商品編集" : "商品追加"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="商品名"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリー
          </label>
          {!showNewCategory ? (
            <div className="flex space-x-2">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">選択してください</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                新規作成
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="新しいカテゴリー名"
                required
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="原価"
            name="cost"
            type="number"
            value={formData.cost}
            onChange={handleChange}
            min="0"
            required
          />

          <Input
            label="販売価格"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="現在庫数"
            name="stock_quantity"
            type="number"
            value={formData.stock_quantity}
            onChange={handleChange}
            min="0"
            required
          />

          <Input
            label="低在庫閾値"
            name="low_stock_threshold"
            type="number"
            value={formData.low_stock_threshold}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="発注点"
            name="reorder_point"
            type="number"
            value={formData.reorder_point}
            onChange={handleChange}
            min="0"
            required
          />

          <Input
            label="最大在庫数"
            name="max_stock"
            type="number"
            value={formData.max_stock}
            onChange={handleChange}
            min="0"
            required
          />
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
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "処理中..." : product ? "更新" : "追加"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
