"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { TableSearchParams, TableStatus } from "@/types/reservation.types";

interface TableFiltersProps {
  onFilterChange: (filters: TableSearchParams) => void;
  onSearch: (query: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "全て" },
  { value: "available", label: "空席" },
  { value: "reserved", label: "予約" },
  { value: "occupied", label: "使用中" },
  { value: "cleaning", label: "清掃中" },
] as const;

const CAPACITY_OPTIONS = [
  { value: "all", label: "全て" },
  { value: "1-2", label: "1-2名" },
  { value: "3-4", label: "3-4名" },
  { value: "5-8", label: "5-8名" },
  { value: "9+", label: "9名以上" },
] as const;

export function TableFilters({ onFilterChange, onSearch }: TableFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    status: string;
    capacity: string;
    isVip: boolean | null;
    isActive: boolean;
  }>({
    status: "all",
    capacity: "all",
    isVip: null,
    isActive: true,
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: string | boolean | null) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Convert UI filters to API filters
    const apiFilters: TableSearchParams = {
      isActive: newFilters.isActive,
    };

    if (newFilters.status !== "all") {
      apiFilters.status = newFilters.status as TableStatus;
    }

    if (newFilters.capacity !== "all") {
      switch (newFilters.capacity) {
        case "1-2":
          apiFilters.minCapacity = 1;
          apiFilters.maxCapacity = 2;
          break;
        case "3-4":
          apiFilters.minCapacity = 3;
          apiFilters.maxCapacity = 4;
          break;
        case "5-8":
          apiFilters.minCapacity = 5;
          apiFilters.maxCapacity = 8;
          break;
        case "9+":
          apiFilters.minCapacity = 9;
          break;
      }
    }

    if (newFilters.isVip !== null) {
      apiFilters.isVip = newFilters.isVip;
    }

    onFilterChange(apiFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      status: "all",
      capacity: "all",
      isVip: null,
      isActive: true,
    };
    setFilters(defaultFilters);
    setSearchQuery("");
    onSearch("");
    onFilterChange({ isActive: true });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.capacity !== "all" ||
    filters.isVip !== null ||
    !filters.isActive ||
    searchQuery !== "";

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="テーブル名で検索..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FunnelIcon className="h-4 w-4" />
          フィルター
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              適用中
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-4 w-4" />
            クリア
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                定員
              </label>
              <select
                value={filters.capacity}
                onChange={(e) => handleFilterChange("capacity", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CAPACITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* VIP Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VIPテーブル
              </label>
              <select
                value={
                  filters.isVip === null ? "all" : filters.isVip.toString()
                }
                onChange={(e) =>
                  handleFilterChange(
                    "isVip",
                    e.target.value === "all" ? null : e.target.value === "true"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">全て</option>
                <option value="true">VIPテーブルのみ</option>
                <option value="false">通常テーブルのみ</option>
              </select>
            </div>

            {/* Active Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表示設定
              </label>
              <select
                value={filters.isActive.toString()}
                onChange={(e) =>
                  handleFilterChange("isActive", e.target.value === "true")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="true">有効なテーブルのみ</option>
                <option value="false">無効なテーブルのみ</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
