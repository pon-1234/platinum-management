"use client";

import { useState } from "react";
import {
  ComplianceDashboard,
  ComplianceReportList,
  IdVerificationList,
} from "@/components/compliance";

type TabType = "dashboard" | "verifications" | "reports";

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">法令遵守管理</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "dashboard"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveTab("verifications")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "verifications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            身分証確認
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            法定帳簿
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === "dashboard" && <ComplianceDashboard />}
        {activeTab === "verifications" && <IdVerificationList />}
        {activeTab === "reports" && <ComplianceReportList />}
      </div>
    </div>
  );
}
