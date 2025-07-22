import { createClient } from "@/lib/supabase/client";
import type { User, UserRole, AuthResult } from "@/types/auth.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type PermissionMatrix = {
  [role in UserRole]: {
    [resource: string]: string[];
  };
};

const PERMISSIONS: PermissionMatrix = {
  admin: {
    // Admin has full access to everything
    "*": ["*"],
  },
  manager: {
    customers: ["create", "view", "edit", "delete"],
    staff: ["manage", "view", "edit"],
    bookings: ["manage", "view", "edit", "delete"],
    billing: ["manage", "view"],
    reports: ["view", "export"],
    inventory: ["manage", "view", "edit"],
    profile: ["view", "edit"],
  },
  hall: {
    customers: ["view", "edit"],
    bookings: ["manage", "view", "edit"],
    tables: ["manage", "view"],
    profile: ["view", "edit"],
  },
  cashier: {
    billing: ["manage", "view", "process"],
    reports: ["view"],
    customers: ["view"],
    profile: ["view", "edit"],
  },
  cast: {
    profile: ["view", "edit"],
    schedule: ["view", "submit"],
    performance: ["view"],
  },
};

export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: data.user,
      };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get role from staff table directly
    try {
      const { data: staffData, error: staffError } = await this.supabase
        .from("staff")
        .select("role")
        .eq("auth_user_id", user.id)
        .single();

      if (staffError || !staffData) {
        console.log(
          "No staff record found, checking for admin user:",
          user.email
        );
        // Special case for admin@platinum-demo.com
        if (user.email === "admin@platinum-demo.com") {
          console.log("Admin user detected, setting role to admin");
          return {
            id: user.id,
            email: user.email!,
            role: "admin" as UserRole,
            staffId: user.user_metadata?.staffId,
          };
        }

        // Fallback to user_metadata
        const role = (user.user_metadata?.role || "cast") as UserRole;
        return {
          id: user.id,
          email: user.email!,
          role,
          staffId: user.user_metadata?.staffId,
        };
      }

      const role = (staffData.role || "cast") as UserRole;
      console.log(
        "AuthService: Retrieved role for user",
        user.email,
        ":",
        role
      );

      return {
        id: user.id,
        email: user.email!,
        role,
        staffId: user.user_metadata?.staffId,
      };
    } catch (dbError) {
      console.error("Database error fetching role:", dbError);
      // Special case for admin@platinum-demo.com
      if (user.email === "admin@platinum-demo.com") {
        console.log("Admin user detected (fallback), setting role to admin");
        return {
          id: user.id,
          email: user.email!,
          role: "admin" as UserRole,
          staffId: user.user_metadata?.staffId,
        };
      }

      // Fallback to user_metadata
      const role = (user.user_metadata?.role || "cast") as UserRole;
      return {
        id: user.id,
        email: user.email!,
        role,
        staffId: user.user_metadata?.staffId,
      };
    }
  }

  hasPermission(user: User, resource: string, action: string): boolean {
    const permissions = PERMISSIONS[user.role];

    // Check for wildcard permissions (admin)
    if (permissions["*"]?.includes("*")) {
      return true;
    }

    // Check specific resource permissions
    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions.includes(action);
  }
}

// Export singleton instance
export const authService = new AuthService();
