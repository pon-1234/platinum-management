import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platinum Management",
  description: "ラウンジ運営管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // ブラウザ拡張機能のエラーを抑制
              (function() {
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('Could not establish connection') || 
                      message.includes('Receiving end does not exist') ||
                      message.includes('runtime.lastError') ||
                      message.includes('inpage.js')) {
                    return;
                  }
                  originalConsoleError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
              maxWidth: "90vw",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
