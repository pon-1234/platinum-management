"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { commandPaletteCommands } from "@/config/navigation";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commandPaletteCommands.slice(0, 8);
    return commandPaletteCommands
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) || c.href.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-24 w-full max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="コマンドパレット"
      >
        <div className="border-b p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="コマンドや画面を検索…"
            className="w-full outline-none text-sm"
            aria-label="検索"
          />
        </div>
        <ul className="max-h-80 overflow-auto py-2 text-sm">
          {results.length === 0 ? (
            <li className="px-4 py-2 text-gray-500">見つかりませんでした</li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  {item.label}
                  <span className="ml-2 text-gray-400 text-xs">
                    {item.href}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
