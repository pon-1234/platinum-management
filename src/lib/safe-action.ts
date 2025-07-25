import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function createSafeAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (
    data: z.infer<TInput>,
    context: { userId: string }
  ) => Promise<TOutput>
) {
  return async (input: z.infer<TInput>): Promise<ActionResult<TOutput>> => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Unauthorized" };
      }

      // Validate input
      const validatedData = schema.parse(input);

      // Execute handler
      const result = await handler(validatedData, { userId: user.id });
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: "Invalid input" };
      }
      if (process.env.NODE_ENV === "development") {
        console.error("Action error:", error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };
}
