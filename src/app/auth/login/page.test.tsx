import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";

// Mock the actions file
vi.mock("./actions", () => ({
  signInWithValidation: vi.fn(),
}));

const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

// Import the mocked function from the module
import { signInWithValidation } from "./actions";
const mockSignInWithValidation = vi.mocked(signInWithValidation);

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithValidation.mockReset();
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

  it("should call signInWithValidation with correct credentials", async () => {
    mockSignInWithValidation.mockResolvedValue(undefined);

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
      expect(mockSignInWithValidation).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("should display error message when login fails", async () => {
    mockSignInWithValidation.mockRejectedValue(
      new Error("メールアドレスまたはパスワードが間違っています")
    );

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
    let resolveSignIn: () => void;
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    });
    mockSignInWithValidation.mockReturnValue(signInPromise);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const submitButton = screen.getByRole("button", { name: /ログイン/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    // Wait for form submission to process
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/ログイン中.../i)).toBeInTheDocument();
    });

    // Resolve the promise
    await act(async () => {
      resolveSignIn!();
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
