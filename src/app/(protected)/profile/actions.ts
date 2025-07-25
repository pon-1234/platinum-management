"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
export const profileUpdateSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z.string().min(10, "有効な電話番号を入力してください").optional(),
  bio: z
    .string()
    .max(500, "自己紹介は500文字以内で入力してください")
    .optional(),
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードは必須です"),
  newPassword: z
    .string()
    .min(8, "新しいパスワードは8文字以上で入力してください"),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;

export async function updateProfile(data: ProfileUpdateData) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "認証エラーが発生しました" };
    }

    // Update auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      email: data.email,
      data: {
        name: data.name,
        phone: data.phone,
        bio: data.bio,
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    // Update staff profile if exists
    const { error: staffError } = await supabase
      .from("staffs")
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (staffError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update staff profile:", staffError);
      }
      // Continue even if staff update fails
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Profile update error:", error);
    }
    return { success: false, error: "プロフィールの更新に失敗しました" };
  }
}

export async function updatePassword(data: PasswordUpdateData) {
  try {
    const supabase = await createClient();

    // Verify current password by re-authenticating
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "認証エラーが発生しました" };
    }

    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (passwordError) {
      return { success: false, error: passwordError.message };
    }

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Password update error:", error);
    }
    return { success: false, error: "パスワードの更新に失敗しました" };
  }
}

export async function getUserProfile() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "認証エラーが発生しました" };
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("name, email, phone, created_at")
      .eq("user_id", user.id)
      .single();

    if (staffError && staffError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get staff profile:", staffError);
      }
    }

    // Merge auth metadata and staff data
    const profile = {
      name:
        staff?.name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "",
      email: staff?.email || user.email || "",
      phone: staff?.phone || user.user_metadata?.phone || "",
      bio: user.user_metadata?.bio || "",
    };

    return { success: true, data: profile };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Get profile error:", error);
    }
    return { success: false, error: "プロフィールの取得に失敗しました" };
  }
}
