"use client";
import React, { createContext, useContext, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DateRange = { from?: Date; to?: Date };

type Filters = {
  storeId?: string;
  range: DateRange;
  castId?: string;
  nominationType?: "hon" | "zai" | "other";
  set: (p: Partial<Omit<Filters, "set">>) => void;
};

const DashboardFilterContext = createContext<Filters | null>(null);

export function DashboardFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const parse = (value: string | null): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const range: DateRange = {
    from: parse(sp.get("from")),
    to: parse(sp.get("to")),
  };

  const value = useMemo<Filters>(
    () => ({
      storeId: sp.get("store") ?? undefined,
      range,
      castId: sp.get("cast") ?? undefined,
      nominationType:
        (sp.get("nomination") as Filters["nominationType"]) ?? undefined,
      set: (p) => {
        const next = new URLSearchParams(sp);
        if (p.storeId !== undefined) next.set("store", p.storeId ?? "");
        if (p.castId !== undefined) next.set("cast", p.castId ?? "");
        if (p.nominationType !== undefined)
          next.set("nomination", p.nominationType ?? "");
        if (p.range?.from)
          next.set("from", p.range.from.toISOString().slice(0, 10));
        if (p.range?.to) next.set("to", p.range.to.toISOString().slice(0, 10));
        router.replace(`${pathname}?${next.toString()}`);
      },
    }),
    [sp, pathname, router, range]
  );

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx)
    throw new Error(
      "useDashboardFilters must be used within DashboardFilterProvider"
    );
  return ctx;
}
