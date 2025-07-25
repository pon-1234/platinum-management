"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSafeAction } from "@/lib/safe-action";

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

export const updateProfile = createSafeAction(
  profileUpdateSchema,
  async (data, { userId }) => {
    const supabase = createClient();

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
      throw new Error(authError.message);
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
      .eq("user_id", userId);

    if (staffError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update staff profile:", staffError);
      }
      // Continue even if staff update fails
    }

    revalidatePath("/profile");
    return null;
  }
);

export const updatePassword = createSafeAction(
  passwordUpdateSchema,
  async (data, { userId }) => {
    const supabase = createClient();

    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (passwordError) {
      throw new Error(passwordError.message);
    }

    return null;
  }
);

export const getUserProfile = createSafeAction(
  z.object({}),
  async (_, { userId }) => {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("認証エラーが発生しました");
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("name, email, phone, created_at")
      .eq("user_id", userId)
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

    return profile;
  }
);
