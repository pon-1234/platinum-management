import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the main heading", () => {
    render(<Home />);
    
    const heading = screen.getByText("Platinum Management");
    expect(heading).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Home />);
    
    const subtitle = screen.getByText("キャバクラ運営管理システム");
    expect(subtitle).toBeInTheDocument();
  });
});