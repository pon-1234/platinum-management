"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";

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

export async function signInWithValidation(data: LoginFormData) {
  // Validate the data
  const validatedData = loginSchema.parse(data);

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password,
  });

  if (error) {
    throw new Error(
      error.message === "Invalid login credentials"
        ? "メールアドレスまたはパスワードが間違っています"
        : error.message
    );
  }

  // Ensure session is properly established
  if (authData.session) {
    // Force refresh the session to ensure cookies are set
    await supabase.auth.getSession();
  }

  // Server Action automatically handles cookies and state
  redirect("/dashboard");
}
