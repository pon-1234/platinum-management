import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBasedNavigation } from "../RoleBasedNavigation";
import type { User } from "@/types/auth.types";

// Mock Next.js modules
const mockUsePathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock auth store
const mockSignOut = vi.fn();
const mockUser = vi.fn<[], User | null>();

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser(),
    signOut: mockSignOut,
  })),
}));

// Mock permission hook
const mockCanAccessRoute = vi.fn();

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({
    canAccessRoute: mockCanAccessRoute,
  }),
}));

describe("RoleBasedNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAccessRoute.mockReturnValue(true);
  });

  it("should render navigation items for admin", () => {
    mockUser.mockReturnValue({
      id: "1",
      email: "admin@test.com",
      role: "admin",
    });

    render(<RoleBasedNavigation />);

    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("顧客管理")).toBeInTheDocument();
    expect(screen.getByText("スタッフ管理")).toBeInTheDocument();
    expect(screen.getByText("予約管理")).toBeInTheDocument();
    expect(screen.getByText("会計管理")).toBeInTheDocument();
    expect(screen.getByText("在庫管理")).toBeInTheDocument();
    expect(screen.getByText("レポート")).toBeInTheDocument();
    expect(screen.getByText("プロフィール")).toBeInTheDocument();
  });

  it("should filter navigation items based on permissions", () => {
    mockUser.mockReturnValue({
      id: "2",
      email: "cast@test.com",
      role: "cast",
    });

    mockCanAccessRoute.mockImplementation((path: string) => {
      const allowedPaths = ["/dashboard", "/profile"];
      return allowedPaths.includes(path);
    });

    render(<RoleBasedNavigation />);

    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("プロフィール")).toBeInTheDocument();
    expect(screen.queryByText("顧客管理")).not.toBeInTheDocument();
    expect(screen.queryByText("スタッフ管理")).not.toBeInTheDocument();
    expect(screen.queryByText("会計管理")).not.toBeInTheDocument();
  });

  it("should display user info and logout button", () => {
    mockUser.mockReturnValue({
      id: "3",
      email: "manager@test.com",
      role: "manager",
    });

    render(<RoleBasedNavigation />);

    expect(screen.getByText("manager@test.com")).toBeInTheDocument();
    expect(screen.getByText("マネージャー")).toBeInTheDocument();
    expect(screen.getByText("ログアウト")).toBeInTheDocument();
  });

  it("should call signOut when logout button is clicked", () => {
    mockUser.mockReturnValue({
      id: "4",
      email: "user@test.com",
      role: "hall",
    });

    render(<RoleBasedNavigation />);

    const logoutButton = screen.getByText("ログアウト");
    logoutButton.click();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("should highlight active navigation item", () => {
    mockUsePathname.mockReturnValue("/customers");

    mockUser.mockReturnValue({
      id: "5",
      email: "admin@test.com",
      role: "admin",
    });

    render(<RoleBasedNavigation />);

    // The link element has the styling classes
    const customersLink = screen.getByRole("link", { name: /顧客管理/ });
    expect(customersLink.className).toContain("bg-gray-50");
    expect(customersLink.className).toContain("text-indigo-600");
  });
});
