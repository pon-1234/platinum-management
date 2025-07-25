"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createAction<T, R>(
  fn: (data: T) => Promise<R>,
  data: T
): Promise<ActionResult<R>> {
  try {
    const result = await fn(data);
    return { success: true, data: result };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Action error:", error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}

export function authenticatedAction<TInput, TOutput>(
  schema: { parse: (data: unknown) => TInput },
  fn: (data: TInput, userId?: string) => Promise<ActionResult<TOutput>>
) {
  return async (data: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Unauthorized" };
      }

      // Validate input
      const validatedData = schema.parse(data);

      return await fn(validatedData, user.id);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Authenticated action error:", error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };
}
