"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("メールアドレスとパスワードを入力してください");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(
      error.message === "Invalid login credentials"
        ? "メールアドレスまたはパスワードが間違っています"
        : error.message
    );
  }

  // Server Action automatically handles cookies and state
  redirect("/dashboard");
}
