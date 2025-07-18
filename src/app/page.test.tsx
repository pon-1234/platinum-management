import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the main heading", () => {
    render(<Home />);

    const heading = screen.getByText("プラチナ管理システム");
    expect(heading).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Home />);

    const subtitle = screen.getByText(
      "キャバクラ運営を効率化する統合管理プラットフォーム"
    );
    expect(subtitle).toBeInTheDocument();
  });

  it("renders login link", () => {
    render(<Home />);

    const loginLink = screen.getByRole("link", { name: "ログイン" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("renders dashboard link", () => {
    render(<Home />);

    const dashboardLink = screen.getByRole("link", {
      name: "ダッシュボードへ",
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
