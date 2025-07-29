import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { User, UserRole, AuthResult } from "@/types/auth.types";
import { CacheUtils } from "@/lib/cache-utils";

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

export class AuthService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
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
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }

      // Clear all service caches after successful sign out
      CacheUtils.clearAllCaches();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("signOut failed:", error);
      }
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        if (error && process.env.NODE_ENV === "development") {
          console.error("Failed to get user:", error);
        }
        return null;
      }

      // Get role using the RPC function to align with middleware
      try {
        const { data: roleData, error: roleError } = await this.supabase.rpc(
          "get_current_user_staff_role"
        );

        if (roleError || !roleData) {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to get user role, signing out:", roleError);
          }
          await this.signOut();
          return null;
        }

        const role = roleData as UserRole;

        // We need staffId for some operations, let's get it from the staffs table
        // This assumes the RLS for staffs table allows the user to read their own record.
        const { data: staff, error: staffError } = await this.supabase
          .from("staffs")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (staffError) {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to get staff id:", staffError);
          }
          // Decide if you want to sign out here as well, or proceed without staffId
        }

        return {
          id: user.id,
          email: user.email!,
          role,
          staffId: staff?.id,
        };
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("Exception when getting user role:", e);
        }
        await this.signOut();
        return null;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getCurrentUser failed:", error);
      }
      return null;
    }
  }

  checkUserPermission(user: User, resource: string, action: string): boolean {
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

  async updateProfile(data: {
    email?: string;
    name?: string;
    phone?: string;
    bio?: string;
  }): Promise<AuthResult> {
    try {
      const { data: authData, error } = await this.supabase.auth.updateUser({
        email: data.email,
        data: {
          name: data.name,
          phone: data.phone,
          bio: data.bio,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: authData.user,
      };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword,
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
}

// Export singleton instance
export const authService = new AuthService();
