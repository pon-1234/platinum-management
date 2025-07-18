"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedNavigation } from "@/components/navigation/RoleBasedNavigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">プラチナ管理</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <RoleBasedNavigation />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
