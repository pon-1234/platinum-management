import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireValidEnvironment } from "@/lib/utils/env-validation";

// Admin client for server-side operations that need to bypass RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to get user role safely without RLS recursion
// Uses the new SECURITY DEFINER function to avoid infinite recursion
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Set the user context for the function call
    await supabaseAdmin.auth.admin.getUserById(userId);

    // Use the safe role retrieval function
    const { data: roleData, error: roleError } = await supabaseAdmin.rpc(
      "get_current_user_staff_role"
    );

    if (roleError) {
      if (process.env.NODE_ENV === "development") {
        console.error("RPC failed, denying access for security:", {
          userId,
          roleError,
        });
      }
      return null;
    }

    return roleData;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Unexpected error getting user role:", { userId, error });
    }
    return null;
  }
}

// Validate environment on server module load (no-op in tests if desired)
try {
  if (process.env.NODE_ENV !== "test") {
    requireValidEnvironment();
  }
} catch (error) {
  throw error;
}

// Helper function to check if user has specific role
export async function userHasRole(
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return userRole ? allowedRoles.includes(userRole) : false;
}

// Helper function to check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  return userHasRole(userId, ["admin"]);
}

// Helper function to check if user is admin or manager
export async function isUserManagerOrAdmin(userId: string): Promise<boolean> {
  return userHasRole(userId, ["admin", "manager"]);
}
