"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedNavigation } from "@/components/navigation/RoleBasedNavigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    const observer = new MutationObserver(() => {
      if (sidebar?.classList.contains("-translate-x-full")) {
        overlay!.style.display = "none";
      } else {
        overlay!.style.display = "block";
      }
    });

    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);
  return (
    <ProtectedRoute
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen flex relative">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-lg"
          onClick={() => {
            const sidebar = document.getElementById("sidebar");
            sidebar?.classList.toggle("-translate-x-full");
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Sidebar */}
        <div
          id="sidebar"
          className="fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-64 bg-white border-r border-gray-200 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out"
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">プラチナ管理</h1>
            <button
              type="button"
              className="lg:hidden p-2 rounded-md"
              onClick={() => {
                const sidebar = document.getElementById("sidebar");
                sidebar?.classList.add("-translate-x-full");
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <RoleBasedNavigation />
          </div>
        </div>

        {/* Overlay */}
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-50 lg:hidden"
          id="overlay"
          onClick={() => {
            const sidebar = document.getElementById("sidebar");
            sidebar?.classList.add("-translate-x-full");
          }}
          style={{ display: "none" }}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:pl-0">
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
