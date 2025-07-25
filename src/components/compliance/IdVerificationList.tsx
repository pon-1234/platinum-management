"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { complianceService } from "@/services/compliance.service";
import { IdType } from "@/types/compliance.types";

interface IdVerificationListProps {
  customerId?: string;
}

interface IdVerificationItem {
  id: string;
  idType?: string;
  id_type?: string;
  idImageUrl?: string | null;
  id_image_url?: string | null;
  birthDate?: string | null;
  birth_date?: string | null;
  verificationDate?: string;
  verification_date?: string;
  verifiedBy?: string | null;
  verified_by?: string | null;
  ocrResult?: Record<string, unknown> | null;
  ocr_result?: Record<string, unknown> | null;
  isVerified?: boolean;
  is_verified?: boolean;
  expiryDate?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    phoneNumber?: string | null;
    phone_number?: string | null;
  };
  verifiedStaff?: {
    id: string;
    fullName?: string;
    full_name?: string;
  } | null;
  verified_staff?: {
    id: string;
    fullName?: string;
    full_name?: string;
  } | null;
}

export function IdVerificationList({ customerId }: IdVerificationListProps) {
  const [verifications, setVerifications] = useState<IdVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    idType: "" as IdType | "",
    isVerified: undefined as boolean | undefined,
  });

  useEffect(() => {
    loadVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, filter]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      let data: IdVerificationItem[];

      if (customerId) {
        data = (await complianceService.getIdVerificationsByCustomer(
          customerId
        )) as IdVerificationItem[];
      } else {
        data = (await complianceService.searchIdVerifications({
          idType: filter.idType || undefined,
          isVerified: filter.isVerified,
        })) as IdVerificationItem[];
      }

      setVerifications(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
      alert("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const getIdTypeName = (type: string) => {
    switch (type) {
      case "license":
        return "運転免許証";
      case "passport":
        return "パスポート";
      case "mynumber":
        return "マイナンバーカード";
      case "residence_card":
        return "在留カード";
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      {!customerId && (
        <div className="flex gap-4 mb-6">
          <select
            value={filter.idType}
            onChange={(e) =>
              setFilter({ ...filter, idType: e.target.value as IdType | "" })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">すべての種類</option>
            <option value="license">運転免許証</option>
            <option value="passport">パスポート</option>
            <option value="mynumber">マイナンバーカード</option>
            <option value="residence_card">在留カード</option>
          </select>

          <select
            value={
              filter.isVerified === undefined
                ? ""
                : filter.isVerified.toString()
            }
            onChange={(e) =>
              setFilter({
                ...filter,
                isVerified:
                  e.target.value === "" ? undefined : e.target.value === "true",
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">すべての状態</option>
            <option value="true">確認済み</option>
            <option value="false">未確認</option>
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                確認日時
              </th>
              {!customerId && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客名
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                身分証種類
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生年月日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                有効期限
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                確認状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                確認者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {verifications.map((verification) => (
              <tr key={verification.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(
                    new Date(
                      verification.verificationDate ||
                        verification.verification_date ||
                        ""
                    ),
                    "yyyy/MM/dd HH:mm",
                    { locale: ja }
                  )}
                </td>
                {!customerId && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {verification.customer?.name || verification.customer?.name}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getIdTypeName(
                    verification.idType || verification.id_type || ""
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {verification.birthDate || verification.birth_date
                    ? format(
                        new Date(
                          verification.birthDate ||
                            verification.birth_date ||
                            ""
                        ),
                        "yyyy/MM/dd",
                        {
                          locale: ja,
                        }
                      )
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {verification.expiryDate || verification.expiry_date
                    ? format(
                        new Date(
                          verification.expiryDate ||
                            verification.expiry_date ||
                            ""
                        ),
                        "yyyy/MM/dd",
                        {
                          locale: ja,
                        }
                      )
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      (verification.isVerified ?? verification.is_verified)
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {(verification.isVerified ?? verification.is_verified)
                      ? "確認済み"
                      : "未確認"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {verification.verifiedStaff?.fullName ||
                    verification.verified_staff?.full_name ||
                    "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(verification.idImageUrl || verification.id_image_url) && (
                    <a
                      href={
                        verification.idImageUrl ||
                        verification.id_image_url ||
                        ""
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      画像を表示
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {verifications.length === 0 && (
        <div className="text-center py-8 text-gray-500">データがありません</div>
      )}
    </div>
  );
}
