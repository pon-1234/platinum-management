"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Primitive = string | number | boolean;

export function useSavedFilters<T extends Record<string, Primitive>>(
  storageKey: string,
  initial: T,
  types: { [K in keyof T]: "string" | "number" | "boolean" }
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lsKey = `filters:${storageKey}`;

  const readFromUrl = (): Partial<T> => {
    const map: Partial<T> = {};
    const params = new URLSearchParams(searchParams?.toString() || "");
    (Object.keys(initial) as Array<keyof T>).forEach((k) => {
      const v = params.get(String(k));
      if (v === null) return;
      const t = types[k];
      if (t === "number") map[k] = Number(v) as T[keyof T];
      else if (t === "boolean") map[k] = (v === "true") as T[keyof T];
      else map[k] = v as unknown as T[keyof T];
    });
    return map;
  };

  const readFromLocalStorage = (): Partial<T> => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return {};
      const obj = JSON.parse(raw) as Partial<T>;
      return obj || {};
    } catch {
      return {};
    }
  };

  const [values, setValues] = useState<T>(() => {
    // Priority: URL > LocalStorage > initial
    const fromUrl = readFromUrl();
    if (Object.keys(fromUrl).length > 0) return { ...initial, ...fromUrl } as T;
    if (typeof window !== "undefined") {
      const fromLs = readFromLocalStorage();
      if (Object.keys(fromLs).length > 0) return { ...initial, ...fromLs } as T;
    }
    return initial;
  });

  // Persist to URL and LocalStorage when values change
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const initialRecord = initial as Record<keyof T, unknown>;
    (Object.keys(values) as Array<keyof T>).forEach((k) => {
      const v = values[k];
      if (v === undefined || v === null || v === initialRecord[k]) {
        params.delete(String(k));
      } else {
        params.set(String(k), String(v));
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
    try {
      localStorage.setItem(lsKey, JSON.stringify(values));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), pathname]);

  const setPartial = useCallback(
    (patch: Partial<T>) => {
      setValues((prev) => ({ ...prev, ...patch }));
    },
    [setValues]
  );

  return useMemo(
    () => ({ values, setValues, setPartial }),
    [values, setPartial, setValues]
  );
}
