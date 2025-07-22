import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth.service";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/auth.types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockSupabaseClient: {
    auth: {
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      getUser: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
    rpc: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as unknown as ReturnType<typeof createClient>
    );
    authService = new AuthService();
  });

  describe("signIn", () => {
    it("should sign in user with valid credentials", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      const mockSession = { access_token: "token123" };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.signIn(
        "test@example.com",
        "password123"
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should return error for invalid credentials", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "Invalid login credentials",
          code: "invalid_credentials",
        },
      });

      const result = await authService.signIn(
        "test@example.com",
        "wrongpassword"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid login credentials");
    });
  });

  describe("signOut", () => {
    it("should sign out user successfully", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it("should throw error when sign out fails", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Sign out failed", code: "signout_error" },
      });

      await expect(authService.signOut()).rejects.toThrow("Sign out failed");
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user with role from session", async () => {
      const mockAuthUser = {
        id: "user-1",
        email: "test@example.com",
        user_metadata: { role: "manager" },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: "manager",
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(user).toEqual({
        id: "user-1",
        email: "test@example.com",
        role: "manager",
      });
    });

    it("should return null when no user is logged in", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe("hasPermission", () => {
    const testUser: User = {
      id: "user-1",
      email: "test@example.com",
      role: "manager",
    };

    it("should grant permission to admin for any resource and action", () => {
      const adminUser: User = { ...testUser, role: "admin" };

      expect(authService.hasPermission(adminUser, "customers", "create")).toBe(
        true
      );
      expect(authService.hasPermission(adminUser, "staff", "delete")).toBe(
        true
      );
      expect(authService.hasPermission(adminUser, "reports", "view")).toBe(
        true
      );
    });

    it("should grant manager permissions correctly", () => {
      const managerUser: User = { ...testUser, role: "manager" };

      expect(
        authService.hasPermission(managerUser, "customers", "create")
      ).toBe(true);
      expect(authService.hasPermission(managerUser, "customers", "view")).toBe(
        true
      );
      expect(authService.hasPermission(managerUser, "staff", "manage")).toBe(
        true
      );
      expect(authService.hasPermission(managerUser, "reports", "view")).toBe(
        true
      );
    });

    it("should grant hall staff permissions correctly", () => {
      const hallUser: User = { ...testUser, role: "hall" };

      expect(authService.hasPermission(hallUser, "customers", "view")).toBe(
        true
      );
      expect(authService.hasPermission(hallUser, "bookings", "manage")).toBe(
        true
      );
      expect(authService.hasPermission(hallUser, "customers", "delete")).toBe(
        false
      );
      expect(authService.hasPermission(hallUser, "staff", "manage")).toBe(
        false
      );
    });

    it("should grant cashier permissions correctly", () => {
      const cashierUser: User = { ...testUser, role: "cashier" };

      expect(authService.hasPermission(cashierUser, "billing", "manage")).toBe(
        true
      );
      expect(authService.hasPermission(cashierUser, "reports", "view")).toBe(
        true
      );
      expect(
        authService.hasPermission(cashierUser, "customers", "create")
      ).toBe(false);
      expect(authService.hasPermission(cashierUser, "staff", "manage")).toBe(
        false
      );
    });

    it("should grant cast permissions correctly", () => {
      const castUser: User = { ...testUser, role: "cast" };

      expect(authService.hasPermission(castUser, "profile", "view")).toBe(true);
      expect(authService.hasPermission(castUser, "profile", "edit")).toBe(true);
      expect(authService.hasPermission(castUser, "customers", "view")).toBe(
        false
      );
      expect(authService.hasPermission(castUser, "billing", "manage")).toBe(
        false
      );
    });
  });
});
