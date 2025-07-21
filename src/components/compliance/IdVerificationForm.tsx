"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IdTypes } from "@/types/compliance.types";
import { z } from "zod";
import { toast } from "react-hot-toast";

// Form-specific schema that matches the component's needs
const idVerificationFormSchema = z.object({
  customerId: z.string().uuid("顧客IDが無効です"),
  idType: z.enum(IdTypes, { message: "身分証明書の種類を選択してください" }),
  idImageUrl: z.string().url("画像URLが無効です").optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日の形式が正しくありません")
    .optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "有効期限の形式が正しくありません")
    .optional(),
  ocrResult: z.record(z.string(), z.unknown()).optional(),
  isVerified: z.boolean(),
  notes: z.string().optional(),
});

type IdVerificationFormData = z.infer<typeof idVerificationFormSchema>;
import { complianceService } from "@/services/compliance.service";
import { createClient } from "@/lib/supabase/client";

interface IdVerificationFormProps {
  customerId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IdVerificationForm({
  customerId,
  onSuccess,
  onCancel,
}: IdVerificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const form = useForm<IdVerificationFormData>({
    resolver: zodResolver(idVerificationFormSchema),
    defaultValues: {
      customerId,
      isVerified: false,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // プレビュー表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Supabase Storageにアップロード
    const fileName = `${customerId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("id-documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      toast.error("画像のアップロードに失敗しました");
      console.error(error);
      return;
    }

    // URLを設定
    const {
      data: { publicUrl },
    } = supabase.storage.from("id-documents").getPublicUrl(fileName);

    setValue("idImageUrl", publicUrl);
  };

  const onSubmit = async (data: IdVerificationFormData) => {
    try {
      setIsSubmitting(true);
      // Convert camelCase to snake_case for the database
      const serviceData = {
        customer_id: data.customerId,
        id_type: data.idType,
        id_image_url: data.idImageUrl,
        birth_date: data.birthDate,
        expiry_date: data.expiryDate,
        ocr_result: data.ocrResult || null,
        is_verified: data.isVerified,
        notes: data.notes,
      };
      await complianceService.createIdVerification(serviceData);
      toast.success("身分証確認情報を登録しました");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          身分証明書の種類 <span className="text-red-500">*</span>
        </label>
        <select
          {...register("idType")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">選択してください</option>
          {IdTypes.map((type) => (
            <option key={type} value={type}>
              {type === "license" && "運転免許証"}
              {type === "passport" && "パスポート"}
              {type === "mynumber" && "マイナンバーカード"}
              {type === "residence_card" && "在留カード"}
            </option>
          ))}
        </select>
        {errors.idType && (
          <p className="mt-1 text-sm text-red-600">{errors.idType.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          身分証明書の画像
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          画像を選択
        </button>
        {imagePreview && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="身分証明書"
              className="max-w-md rounded-lg shadow-md"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            生年月日
          </label>
          <input
            type="date"
            {...register("birthDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.birthDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.birthDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            有効期限
          </label>
          <input
            type="date"
            {...register("expiryDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.expiryDate.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          確認状態
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            {...register("isVerified")}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2">身分証を確認済み</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          備考
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="確認時の注意事項など"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "登録中..." : "登録"}
        </button>
      </div>
    </form>
  );
}
