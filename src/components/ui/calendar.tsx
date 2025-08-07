import * as React from "react";
import { cn } from "@/lib/utils";

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  locale?: unknown;
  className?: string;
}

export function Calendar({ className, selected, onSelect }: CalendarProps) {
  return (
    <div className={cn("p-3", className)}>
      <input
        type="date"
        value={selected ? selected.toISOString().split("T")[0] : ""}
        onChange={(e) =>
          onSelect?.(e.target.value ? new Date(e.target.value) : undefined)
        }
        className="w-full p-2 border rounded"
      />
    </div>
  );
}
