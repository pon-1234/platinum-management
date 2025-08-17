import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireValidEnvironment } from "@/lib/utils/env-validation";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Validate environment on server module load (no-op in tests if desired)
try {
  if (process.env.NODE_ENV !== "test") {
    requireValidEnvironment();
  }
} catch (error) {
  // Re-throw to fail fast during boot if misconfigured
  throw error;
}
