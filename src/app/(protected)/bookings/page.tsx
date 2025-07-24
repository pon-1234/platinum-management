"use client";

import { useState } from "react";
import {
  CalendarIcon,
  ListBulletIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { ReservationList } from "@/components/reservation/ReservationList";
import { ReservationCalendar } from "@/components/reservation/ReservationCalendar";
import { CreateReservationModal } from "@/components/reservation/CreateReservationModal";
import { ReservationDetailModal } from "@/components/reservation/ReservationDetailModal";
import { RoleGate } from "@/components/auth/RoleGate";
import { format } from "date-fns";
import type {
  Reservation,
  ReservationWithDetails,
} from "@/types/reservation.types";

type ViewMode = "list" | "calendar";

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithDetails | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    if (viewMode === "calendar") {
      // Calendar already shows reservations for selected date
    }
  };

  const handleReservationSelect = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation);
  };

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <RoleGate allowedRoles={["admin", "manager", "hall"]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              予約管理
            </h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              新規予約
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center justify-center">
          <div className="inline-flex rounded-lg shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <ListBulletIcon className="w-4 h-4 inline-block mr-2" />
              リスト表示
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                viewMode === "calendar"
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline-block mr-2" />
              カレンダー表示
            </button>
          </div>
        </div>

        {/* Date Filter for List View */}
        {viewMode === "list" && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <label
                htmlFor="date"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                日付:
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          {viewMode === "list" ? (
            <ReservationList
              key={refreshKey}
              date={selectedDate}
              onReservationSelect={handleReservationSelect}
            />
          ) : (
            <ReservationCalendar
              key={refreshKey}
              onDateSelect={handleDateSelect}
              onReservationSelect={handleReservationSelect}
            />
          )}
        </div>

        {/* Create Reservation Modal */}
        <CreateReservationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          initialDate={selectedDate}
        />

        {/* Reservation Detail Modal */}
        <ReservationDetailModal
          reservation={selectedReservation}
          isOpen={!!selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </RoleGate>
  );
}
