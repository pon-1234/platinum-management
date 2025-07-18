import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";
import { AuthService } from "@/services/auth.service";

// Mock the auth service
vi.mock("@/services/auth.service");

const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  let mockAuthService: {
    signIn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      signIn: vi.fn(),
    };
    vi.mocked(AuthService).mockReturnValue(
      mockAuthService as unknown as AuthService
    );
  });

  it("should render login form with email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ログイン/i })
    ).toBeInTheDocument();
  });

  it("should display validation errors for empty fields", async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole("button", { name: /ログイン/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/メールアドレスを入力してください/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/パスワードを入力してください/i)
      ).toBeInTheDocument();
    });
  });

  it("should display validation error for invalid email format", async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(
      /メールアドレス/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/パスワード/i);

    // Fill in password to avoid password validation error
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    });

    // HTML5 email validation will prevent form submission
    // So we need to check the validity state
    expect(emailInput.validity.valid).toBe(false);
    expect(emailInput.validity.typeMismatch).toBe(true);
  });

  it("should call authService.signIn with correct credentials", async () => {
    mockAuthService.signIn.mockResolvedValue({ success: true });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const submitButton = screen.getByRole("button", { name: /ログイン/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should display error message when login fails", async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: false,
      error: "メールアドレスまたはパスワードが間違っています",
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const submitButton = screen.getByRole("button", { name: /ログイン/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/メールアドレスまたはパスワードが間違っています/i)
      ).toBeInTheDocument();
    });
  });

  it("should disable submit button while logging in", async () => {
    let resolveSignIn: (value: { success: boolean }) => void;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    mockAuthService.signIn.mockReturnValue(signInPromise);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const submitButton = screen.getByRole("button", { name: /ログイン/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    // Button should be disabled immediately after click
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/ログイン中.../i)).toBeInTheDocument();

    // Resolve the promise
    await act(async () => {
      resolveSignIn!({ success: true });
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
