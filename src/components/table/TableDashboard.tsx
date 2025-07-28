"use client";

import { useMemo } from "react";
import {
  UserGroupIcon,
  ClockIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import type { Table } from "@/types/reservation.types";

interface TableDashboardProps {
  tables: Table[];
  isLoading?: boolean;
}

interface TableStats {
  total: number;
  available: number;
  reserved: number;
  occupied: number;
  cleaning: number;
  totalCapacity: number;
  utilizationRate: number;
  inactiveTables: number;
}

export function TableDashboard({
  tables,
  isLoading = false,
}: TableDashboardProps) {
  const stats = useMemo((): TableStats => {
    if (tables.length === 0) {
      return {
        total: 0,
        available: 0,
        reserved: 0,
        occupied: 0,
        cleaning: 0,
        totalCapacity: 0,
        utilizationRate: 0,
        inactiveTables: 0,
      };
    }

    const activeTables = tables.filter((table) => table.isActive);
    const inactiveTables = tables.filter((table) => !table.isActive);

    const statusCounts = activeTables.reduce(
      (acc, table) => {
        acc[table.currentStatus]++;
        return acc;
      },
      { available: 0, reserved: 0, occupied: 0, cleaning: 0 }
    );

    const totalCapacity = activeTables.reduce(
      (sum, table) => sum + table.capacity,
      0
    );
    const occupiedTables = statusCounts.occupied + statusCounts.reserved;
    const utilizationRate =
      activeTables.length > 0
        ? (occupiedTables / activeTables.length) * 100
        : 0;

    return {
      total: activeTables.length,
      ...statusCounts,
      totalCapacity,
      utilizationRate,
      inactiveTables: inactiveTables.length,
    };
  }, [tables]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "総テーブル数",
      value: stats.total,
      description: `総定員: ${stats.totalCapacity}名`,
      icon: UserGroupIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "稼働率",
      value: `${Math.round(stats.utilizationRate)}%`,
      description: `使用中: ${stats.occupied + stats.reserved}テーブル`,
      icon: ClockIcon,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "非表示テーブル",
      value: stats.inactiveTables,
      description: "メンテナンス・非稼働",
      icon: EyeSlashIcon,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {stat.title}
                </h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600">{stat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">テーブル状況</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.available}
            </p>
            <p className="text-sm text-gray-600">空席</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-yellow-500 rounded"></div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.reserved}
            </p>
            <p className="text-sm text-gray-600">予約</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-red-100 rounded-lg flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.occupied}
            </p>
            <p className="text-sm text-gray-600">使用中</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-gray-500 rounded"></div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.cleaning}
            </p>
            <p className="text-sm text-gray-600">清掃中</p>
          </div>
        </div>
      </div>
    </div>
  );
}
