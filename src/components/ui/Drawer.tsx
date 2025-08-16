"use client";

import { useEffect, useRef } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "right" | "left";
  widthClassName?: string; // e.g., "sm:w-[520px]"
  title?: string;
  children: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  side = "right",
  widthClassName = "sm:w-[520px]",
  title,
  children,
}: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      {/* overlay */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="閉じる"
      />
      {/* panel */}
      <div
        ref={ref}
        className={`absolute top-0 ${
          side === "right" ? "right-0" : "left-0"
        } h-full w-full ${widthClassName} bg-white shadow-2xl transform transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : side === "right"
              ? "translate-x-full"
              : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title || "詳細"}
      >
        {children}
      </div>
    </div>
  );
}
