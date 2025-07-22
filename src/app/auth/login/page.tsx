"use client";

import { signInWithValidation } from "./actions";
import { useFormValidation } from "@/hooks/useFormValidation";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";

export default function LoginPage() {
  const form = useFormValidation<LoginFormData>({
    schema: loginSchema,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (data: LoginFormData) => {
    await signInWithValidation(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            プラチナ管理システム
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アカウントにログインしてください
          </p>
        </div>

        <form
          onSubmit={form.handleAsyncSubmit(handleSubmit)}
          className="mt-8 space-y-6"
        >
          {/* Root Error */}
          {form.formState.errors.root && (
            <ErrorMessage message={form.formState.errors.root.message!} />
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                {...form.register("email")}
                id="email"
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="メールアドレス"
                aria-label="メールアドレス"
                disabled={form.formState.isSubmitting}
              />
              {form.formState.errors.email && (
                <div className="mt-1">
                  <ErrorMessage
                    message={form.formState.errors.email.message!}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                {...form.register("password")}
                id="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="パスワード"
                aria-label="パスワード"
                disabled={form.formState.isSubmitting}
              />
              {form.formState.errors.password && (
                <div className="mt-1">
                  <ErrorMessage
                    message={form.formState.errors.password.message!}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
            >
              {form.formState.isSubmitting && <LoadingSpinner size="sm" />}
              {form.formState.isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
