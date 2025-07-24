"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createAction<T, R>(
  fn: (data: T) => Promise<R>
): Promise<ActionResult<R>> {
  try {
    const result = await fn(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}

export async function authenticatedAction<T, R>(
  fn: (data: T, userId: string) => Promise<R>
): Promise<(data: T) => Promise<ActionResult<R>>> {
  return async (data: T) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Unauthorized" };
      }

      const result = await fn(data, user.id);
      return { success: true, data: result };
    } catch (error) {
      console.error("Authenticated action error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };
}
