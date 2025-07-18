import { describe, it, expect } from "vitest";
import {
  canAccessRoute,
  getRedirectPath,
  getAccessibleRoutes,
  hasPermission,
} from "../permissions";
import type { User } from "@/types/auth.types";

describe("Permission utilities", () => {
  const mockUsers: Record<string, User> = {
    admin: { id: "1", email: "admin@test.com", role: "admin" },
    manager: { id: "2", email: "manager@test.com", role: "manager" },
    hall: { id: "3", email: "hall@test.com", role: "hall" },
    cashier: { id: "4", email: "cashier@test.com", role: "cashier" },
    cast: { id: "5", email: "cast@test.com", role: "cast" },
  };

  describe("canAccessRoute", () => {
    it("should return false for unauthenticated users", () => {
      expect(canAccessRoute(null, "/dashboard")).toBe(false);
      expect(canAccessRoute(null, "/customers")).toBe(false);
    });

    it("should allow admin access to all routes", () => {
      const admin = mockUsers.admin;
      expect(canAccessRoute(admin, "/dashboard")).toBe(true);
      expect(canAccessRoute(admin, "/customers")).toBe(true);
      expect(canAccessRoute(admin, "/staff")).toBe(true);
      expect(canAccessRoute(admin, "/billing")).toBe(true);
      expect(canAccessRoute(admin, "/inventory")).toBe(true);
    });

    it("should allow manager access to appropriate routes", () => {
      const manager = mockUsers.manager;
      expect(canAccessRoute(manager, "/dashboard")).toBe(true);
      expect(canAccessRoute(manager, "/customers")).toBe(true);
      expect(canAccessRoute(manager, "/staff")).toBe(true);
      expect(canAccessRoute(manager, "/bookings")).toBe(true);
      expect(canAccessRoute(manager, "/billing")).toBe(true);
      expect(canAccessRoute(manager, "/inventory")).toBe(true);
      expect(canAccessRoute(manager, "/reports")).toBe(true);
    });

    it("should restrict hall staff access", () => {
      const hall = mockUsers.hall;
      expect(canAccessRoute(hall, "/dashboard")).toBe(true);
      expect(canAccessRoute(hall, "/customers")).toBe(true);
      expect(canAccessRoute(hall, "/bookings")).toBe(true);
      expect(canAccessRoute(hall, "/staff")).toBe(false);
      expect(canAccessRoute(hall, "/billing")).toBe(false);
      expect(canAccessRoute(hall, "/inventory")).toBe(false);
    });

    it("should restrict cashier access", () => {
      const cashier = mockUsers.cashier;
      expect(canAccessRoute(cashier, "/dashboard")).toBe(true);
      expect(canAccessRoute(cashier, "/customers")).toBe(true);
      expect(canAccessRoute(cashier, "/billing")).toBe(true);
      expect(canAccessRoute(cashier, "/reports")).toBe(true);
      expect(canAccessRoute(cashier, "/staff")).toBe(false);
      expect(canAccessRoute(cashier, "/bookings")).toBe(false);
      expect(canAccessRoute(cashier, "/inventory")).toBe(false);
    });

    it("should restrict cast access", () => {
      const cast = mockUsers.cast;
      expect(canAccessRoute(cast, "/dashboard")).toBe(true);
      expect(canAccessRoute(cast, "/profile")).toBe(true);
      expect(canAccessRoute(cast, "/cast/profile")).toBe(true);
      expect(canAccessRoute(cast, "/cast/schedule")).toBe(true);
      expect(canAccessRoute(cast, "/customers")).toBe(false);
      expect(canAccessRoute(cast, "/staff")).toBe(false);
      expect(canAccessRoute(cast, "/billing")).toBe(false);
    });

    it("should handle nested routes", () => {
      const manager = mockUsers.manager;
      expect(canAccessRoute(manager, "/customers/123")).toBe(true);
      expect(canAccessRoute(manager, "/staff/edit/456")).toBe(true);

      const cast = mockUsers.cast;
      expect(canAccessRoute(cast, "/customers/123")).toBe(false);
    });

    it("should allow access to auth pages for all", () => {
      expect(canAccessRoute(null, "/auth/login")).toBe(true);
      expect(canAccessRoute(mockUsers.admin, "/auth/login")).toBe(true);
    });
  });

  describe("getRedirectPath", () => {
    it("should redirect unauthenticated users to login", () => {
      expect(getRedirectPath(null, "/dashboard")).toBe("/auth/login");
      expect(getRedirectPath(null, "/customers")).toBe("/auth/login");
    });

    it("should use specific redirect paths when defined", () => {
      const cast = mockUsers.cast;
      expect(getRedirectPath(cast, "/customers")).toBe("/dashboard");
      expect(getRedirectPath(cast, "/staff")).toBe("/dashboard");
    });

    it("should default to dashboard for undefined redirects", () => {
      const manager = mockUsers.manager;
      expect(getRedirectPath(manager, "/unknown-route")).toBe("/dashboard");
    });
  });

  describe("getAccessibleRoutes", () => {
    it("should return empty array for unauthenticated users", () => {
      expect(getAccessibleRoutes(null)).toEqual([]);
    });

    it("should return all routes for admin", () => {
      const routes = getAccessibleRoutes(mockUsers.admin);
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some((r) => r.path === "/staff")).toBe(true);
      expect(routes.some((r) => r.path === "/inventory")).toBe(true);
      // Check that admin has access to all defined routes
      const adminPaths = routes.map((r) => r.path);
      expect(adminPaths).toContain("/dashboard");
      expect(adminPaths).toContain("/customers");
      expect(adminPaths).toContain("/staff");
      expect(adminPaths).toContain("/bookings");
      expect(adminPaths).toContain("/billing");
      expect(adminPaths).toContain("/inventory");
      expect(adminPaths).toContain("/reports");
      expect(adminPaths).toContain("/profile");
    });

    it("should return limited routes for cast", () => {
      const routes = getAccessibleRoutes(mockUsers.cast);
      expect(routes.some((r) => r.path === "/dashboard")).toBe(true);
      expect(routes.some((r) => r.path === "/profile")).toBe(true);
      expect(routes.some((r) => r.path === "/cast/profile")).toBe(true);
      expect(routes.some((r) => r.path === "/cast/schedule")).toBe(true);
      expect(routes.some((r) => r.path === "/customers")).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("should return false for unauthenticated users", () => {
      expect(hasPermission(null, "customers", "view")).toBe(false);
    });

    it("should grant admin all permissions", () => {
      const admin = mockUsers.admin;
      expect(hasPermission(admin, "customers", "delete")).toBe(true);
      expect(hasPermission(admin, "staff", "manage")).toBe(true);
      expect(hasPermission(admin, "anything", "anything")).toBe(true);
    });

    it("should grant manager appropriate permissions", () => {
      const manager = mockUsers.manager;
      expect(hasPermission(manager, "customers", "create")).toBe(true);
      expect(hasPermission(manager, "customers", "delete")).toBe(true);
      expect(hasPermission(manager, "staff", "manage")).toBe(true);
      expect(hasPermission(manager, "reports", "export")).toBe(true);
    });

    it("should restrict hall staff permissions", () => {
      const hall = mockUsers.hall;
      expect(hasPermission(hall, "customers", "view")).toBe(true);
      expect(hasPermission(hall, "customers", "edit")).toBe(true);
      expect(hasPermission(hall, "customers", "delete")).toBe(false);
      expect(hasPermission(hall, "staff", "manage")).toBe(false);
      expect(hasPermission(hall, "bookings", "manage")).toBe(true);
    });

    it("should restrict cashier permissions", () => {
      const cashier = mockUsers.cashier;
      expect(hasPermission(cashier, "billing", "manage")).toBe(true);
      expect(hasPermission(cashier, "billing", "process")).toBe(true);
      expect(hasPermission(cashier, "customers", "view")).toBe(true);
      expect(hasPermission(cashier, "customers", "edit")).toBe(false);
      expect(hasPermission(cashier, "staff", "manage")).toBe(false);
    });

    it("should restrict cast permissions", () => {
      const cast = mockUsers.cast;
      expect(hasPermission(cast, "profile", "view")).toBe(true);
      expect(hasPermission(cast, "profile", "edit")).toBe(true);
      expect(hasPermission(cast, "schedule", "submit")).toBe(true);
      expect(hasPermission(cast, "customers", "view")).toBe(false);
      expect(hasPermission(cast, "billing", "manage")).toBe(false);
    });
  });
});
