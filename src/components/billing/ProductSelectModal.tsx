"use client";

import { useState, useEffect } from "react";
import { billingService } from "@/services/billing.service";
import type { Product, CreateOrderItemData } from "@/types/billing.types";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "@/components/ui/Modal";
import { toast } from "react-hot-toast";

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  onItemsAdded: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  alcoholic_beverages: "アルコール飲料",
  non_alcoholic_beverages: "ソフトドリンク",
  food: "フード",
  tobacco: "タバコ",
  other: "その他",
};

export default function ProductSelectModal({
  isOpen,
  onClose,
  visitId,
  onItemsAdded,
}: ProductSelectModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await billingService.searchProducts({ isActive: true });
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("商品の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) =>
        prevCart.filter((item) => item.product.id !== productId)
      );
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateNotes = (productId: number, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  const getTotalAmount = () => {
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("商品を選択してください");
      return;
    }

    try {
      setIsSubmitting(true);

      const orderItems: CreateOrderItemData[] = cart.map((item) => ({
        visitId,
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        notes: item.notes,
      }));

      await Promise.all(
        orderItems.map((item) => billingService.createOrderItem(item))
      );

      toast.success(`${cart.length}点の商品を追加しました`);
      setCart([]);
      onItemsAdded();
      onClose();
    } catch (error) {
      console.error("Failed to add order items:", error);
      toast.error("商品の追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCart([]);
    setSearchQuery("");
    setSelectedCategory("all");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="商品選択"
      maxWidth="max-w-4xl"
    >
      <div className="flex h-[600px]">
        {/* Product List */}
        <div className="flex-1 pr-4 border-r">
          {/* Search and Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="商品名で検索..."
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                すべて
              </button>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSelectedCategory(value)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    selectedCategory === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[400px]">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(
                  (item) => item.product.id === product.id
                );
                return (
                  <div
                    key={product.id}
                    className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-500">
                          {CATEGORY_LABELS[product.category] ||
                            product.category}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          ¥{product.price.toLocaleString()}
                        </p>
                      </div>
                      {cartItem && (
                        <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="w-80 pl-4">
          <h3 className="font-medium text-lg mb-3">選択した商品</h3>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              商品を選択してください
            </p>
          ) : (
            <>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ¥{item.product.price.toLocaleString()} ×{" "}
                          {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">
                        ¥{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.product.id, item.quantity - 1);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.product.id,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 text-center border rounded px-2 py-1"
                        min="0"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.product.id, item.quantity + 1);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="備考（オプション）"
                      value={item.notes || ""}
                      onChange={(e) =>
                        updateNotes(item.product.id, e.target.value)
                      }
                      className="w-full text-sm border rounded px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">合計</span>
                  <span className="text-xl font-bold">
                    ¥{getTotalAmount().toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={handleClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "追加中..." : `${cart.length}点を追加`}
        </button>
      </div>
    </Modal>
  );
}
