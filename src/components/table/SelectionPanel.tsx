"use client";

import React from "react";

interface SelectionAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary";
}

interface SelectionPanelProps {
  selectedCount: number;
  actions: SelectionAction[];
}

export function SelectionPanel({
  selectedCount,
  actions,
}: SelectionPanelProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-xl border rounded-lg p-3 flex items-center gap-2 z-50">
      <span className="text-sm text-gray-700">選択: {selectedCount} 件</span>
      {actions.map((action, idx) => (
        <button
          key={idx}
          className={`px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50 ${
            action.variant === "primary"
              ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
              : ""
          }`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
