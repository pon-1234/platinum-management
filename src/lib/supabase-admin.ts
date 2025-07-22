import { createClient } from "@supabase/supabase-js";

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
      console.error("Failed to get user role via function:", {
        userId,
        roleError,
      });

      // Fallback to direct query using service role (bypasses RLS)
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from("staffs")
        .select("role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (staffError || !staffData) {
        console.error("Failed to get user role via fallback:", {
          userId,
          staffError,
        });
        return null;
      }

      return staffData.role;
    }

    return roleData;
  } catch (error) {
    console.error("Unexpected error getting user role:", { userId, error });
    return null;
  }
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
