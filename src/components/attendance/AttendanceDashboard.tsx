"use client";

import {
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { AttendanceDashboard as AttendanceDashboardType } from "@/types/attendance.types";

interface AttendanceDashboardProps {
  data: AttendanceDashboardType | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AttendanceDashboard({
  data,
  isLoading,
  onRefresh,
}: AttendanceDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          データを読み込めませんでした
        </h3>
        <button
          onClick={onRefresh}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const todayStats = [
    {
      label: "総スタッフ数",
      value: data.today.totalStaff,
      icon: UserGroupIcon,
      color: "blue",
      description: "本日のスタッフ数",
    },
    {
      label: "出勤中",
      value: data.today.presentStaff,
      icon: ClockIcon,
      color: "green",
      description: "現在出勤中のスタッフ",
    },
    {
      label: "遅刻",
      value: data.today.lateStaff,
      icon: ExclamationTriangleIcon,
      color: "yellow",
      description: "本日遅刻したスタッフ",
    },
    {
      label: "欠勤",
      value: data.today.absentStaff,
      icon: UserMinusIcon,
      color: "red",
      description: "本日欠勤のスタッフ",
    },
  ];

  const weeklyStats = [
    {
      label: "週平均出勤率",
      value: `${data.thisWeek.averageAttendance.toFixed(1)}%`,
      icon: ChartBarIcon,
      color: "indigo",
      description: "今週の平均出勤率",
    },
    {
      label: "承認待ち申請",
      value: data.pendingRequests.shiftRequests,
      icon: DocumentTextIcon,
      color: "orange",
      description: "シフト変更申請など",
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400";
      case "green":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400";
      case "yellow":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400";
      case "red":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400";
      case "indigo":
        return "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400";
      case "orange":
        return "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          本日の勤怠状況
        </h2>
        <button
          onClick={onRefresh}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          更新
        </button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {todayStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-md ${getColorClasses(stat.color)}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Stats */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          今週の統計
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weeklyStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div
                  className={`p-3 rounded-md ${getColorClasses(stat.color)}`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          クイックアクション
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
            出勤記録確認
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-500" />
            シフト申請管理
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChartBarIcon className="w-5 h-5 mr-2 text-gray-500" />
            レポート作成
          </button>
        </div>
      </div>
    </div>
  );
}
