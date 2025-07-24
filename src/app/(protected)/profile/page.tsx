"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { useAuthStore } from "@/stores/auth.store";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z.string().min(10, "有効な電話番号を入力してください").optional(),
  bio: z
    .string()
    .max(500, "自己紹介は500文字以内で入力してください")
    .optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードは必須です"),
    newPassword: z
      .string()
      .min(8, "新しいパスワードは8文字以上で入力してください"),
    confirmPassword: z.string().min(1, "パスワード確認は必須です"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "notifications" | "security"
  >("profile");
  const [isLoading, setIsLoading] = useState(false);

  // Profile form
  const profileForm = useFormValidation<ProfileFormData>({
    schema: profileSchema,
    defaultValues: {
      name: user?.email?.split("@")[0] || "",
      email: user?.email || "",
      phone: "",
      bio: "",
    },
  });

  // Password form
  const passwordForm = useFormValidation<PasswordFormData>({
    schema: passwordSchema,
  });

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Profile updated:", data);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Password updated");
      passwordForm.reset();
    } catch (error) {
      console.error("Password update failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: "profile" as const, name: "プロフィール", icon: UserCircleIcon },
    { id: "password" as const, name: "パスワード", icon: KeyIcon },
    { id: "notifications" as const, name: "通知設定", icon: BellIcon },
    { id: "security" as const, name: "セキュリティ", icon: ShieldCheckIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
        <p className="text-gray-600">アカウント設定とプロフィール情報</p>
      </div>

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <UserCircleIcon className="w-10 h-10 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.email?.split("@")[0] || "ユーザー"}
            </h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {user.role === "admin"
                  ? "管理者"
                  : user.role === "manager"
                    ? "マネージャー"
                    : user.role === "hall"
                      ? "ホールスタッフ"
                      : user.role === "cashier"
                        ? "レジ担当"
                        : "キャスト"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {activeTab === "profile" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    プロフィール情報
                  </h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                    >
                      <PencilIcon className="w-4 h-4" />
                      編集
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        キャンセル
                      </button>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={profileForm.handleAsyncSubmit(handleProfileSubmit)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名前
                    </label>
                    <input
                      type="text"
                      {...profileForm.register("name")}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                    {profileForm.formState.errors.name && (
                      <ErrorMessage
                        message={profileForm.formState.errors.name.message!}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      {...profileForm.register("email")}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                    {profileForm.formState.errors.email && (
                      <ErrorMessage
                        message={profileForm.formState.errors.email.message!}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号
                    </label>
                    <input
                      type="tel"
                      {...profileForm.register("phone")}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                    {profileForm.formState.errors.phone && (
                      <ErrorMessage
                        message={profileForm.formState.errors.phone.message!}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      自己紹介
                    </label>
                    <textarea
                      {...profileForm.register("bio")}
                      disabled={!isEditing}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                    {profileForm.formState.errors.bio && (
                      <ErrorMessage
                        message={profileForm.formState.errors.bio.message!}
                      />
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <CheckIcon className="w-4 h-4" />
                        )}
                        保存
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeTab === "password" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  パスワード変更
                </h3>
                <form
                  onSubmit={passwordForm.handleAsyncSubmit(
                    handlePasswordSubmit
                  )}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      現在のパスワード
                    </label>
                    <input
                      type="password"
                      {...passwordForm.register("currentPassword")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <ErrorMessage
                        message={
                          passwordForm.formState.errors.currentPassword.message!
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード
                    </label>
                    <input
                      type="password"
                      {...passwordForm.register("newPassword")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <ErrorMessage
                        message={
                          passwordForm.formState.errors.newPassword.message!
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード（確認）
                    </label>
                    <input
                      type="password"
                      {...passwordForm.register("confirmPassword")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <ErrorMessage
                        message={
                          passwordForm.formState.errors.confirmPassword.message!
                        }
                      />
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                      パスワード変更
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  通知設定
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">メール通知</p>
                      <p className="text-sm text-gray-600">
                        重要な更新をメールで受け取る
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">プッシュ通知</p>
                      <p className="text-sm text-gray-600">
                        ブラウザ通知を受け取る
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">システム通知</p>
                      <p className="text-sm text-gray-600">
                        システムメンテナンス等の通知
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  セキュリティ
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      ログイン履歴
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="text-sm font-medium">Chrome on macOS</p>
                          <p className="text-xs text-gray-500">192.168.1.100</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            2024-01-22 14:30
                          </p>
                          <p className="text-xs text-green-600">
                            現在のセッション
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="text-sm font-medium">
                            Chrome on Windows
                          </p>
                          <p className="text-xs text-gray-500">192.168.1.105</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            2024-01-21 09:15
                          </p>
                          <p className="text-xs text-gray-500">24時間前</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      セキュリティ設定
                    </h4>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                        <p className="font-medium text-gray-900">
                          二段階認証を有効にする
                        </p>
                        <p className="text-sm text-gray-600">
                          セキュリティを強化するために推奨されます
                        </p>
                      </button>
                      <button className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                        <p className="font-medium text-gray-900">
                          全てのデバイスからログアウト
                        </p>
                        <p className="text-sm text-gray-600">
                          他のデバイスの全セッションを終了します
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
