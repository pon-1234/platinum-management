import type { User } from "@/types/auth.types";

/**
 * AuthManager - Singleton for managing authentication state across services
 * This allows non-React code (like services) to access auth state
 */
class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Set the current user
   * This should be called by the auth store when user state changes
   */
  public setUser(user: User | null): void {
    this.currentUser = user;
  }

  /**
   * Get the current user
   */
  public getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get the current staff ID
   */
  public getStaffId(): string | null {
    return this.currentUser?.staffId || null;
  }

  /**
   * Clear the current user
   */
  public clearUser(): void {
    this.currentUser = null;
  }
}

export const authManager = AuthManager.getInstance();
