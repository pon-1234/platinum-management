import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { User } from "@/types/auth.types";

// Hoist the mock setup
const { mockSignIn, mockSignOut, mockGetCurrentUser } = vi.hoisted(() => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetCurrentUser = vi.fn();
  return { mockSignIn, mockSignOut, mockGetCurrentUser };
});

// Mock the auth service module
vi.mock("@/services/auth.service", () => ({
  AuthService: vi.fn(() => ({
    signIn: mockSignIn,
    signOut: mockSignOut,
    getCurrentUser: mockGetCurrentUser,
  })),
}));

// Import after mocking
import { useAuthStore } from "../auth.store";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Clear the store before each test
    useAuthStore.setState({ user: null, isLoading: false, error: null });

    // Reset mocks
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockGetCurrentUser.mockReset();
  });

  describe("initial state", () => {
    it("should have null user and not be loading", () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("signIn", () => {
    it("should sign in user successfully", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        role: "manager",
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
      expect(mockSignIn).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("should handle sign in error", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe("Invalid credentials");
    });

    it("should set loading state during sign in", async () => {
      let resolveSignIn: (value: { success: boolean }) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      const { result } = renderHook(() => useAuthStore());

      // Start the sign in process
      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      // Now loading should be true
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveSignIn!({ success: true });
        mockGetCurrentUser.mockResolvedValue(null);
        // Wait for the promise to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signOut", () => {
    it("should sign out user successfully", async () => {
      // Set initial user
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        role: "manager",
      };
      useAuthStore.setState({ user: mockUser });

      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("should handle sign out error", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        role: "manager",
      };
      useAuthStore.setState({ user: mockUser });

      mockSignOut.mockRejectedValue(new Error("Sign out failed"));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBe("Sign out failed");
      // User should still be cleared even if sign out fails
      expect(result.current.user).toBeNull();
    });
  });

  describe("fetchUser", () => {
    it("should fetch current user successfully", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        role: "cashier",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch user when no user is logged in", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch user error", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe("Network error");
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useAuthStore.setState({ error: "Some error" });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
