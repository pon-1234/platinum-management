import { describe, it, expect } from "vitest";
import { quoteSession } from "../billing.service";

const addMin = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60000);

describe("pricing engine", () => {
  it("BAR: 90分ちょうど → 延長なし", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 90).toISOString();
    const q = quoteSession({ plan: "BAR", startAt: start, endAt: end });
    expect(q.subtotal).toBe(3000);
    expect(q.serviceTax).toBe(600);
    expect(q.total).toBe(3600);
    expect(q.lines.some((l) => l.code.startsWith("EXT_"))).toBe(false);
  });

  it("BAR: 95分 → 30分延長×1", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 95).toISOString();
    const q = quoteSession({ plan: "BAR", startAt: start, endAt: end });
    expect(q.subtotal).toBe(4000); // 3000 + 1000
    expect(q.serviceTax).toBe(800);
    expect(q.total).toBe(4800);
  });

  it("COUNTER: 75分 → 10分延長×2", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 75).toISOString();
    const q = quoteSession({ plan: "COUNTER", startAt: start, endAt: end });
    expect(q.subtotal).toBe(10000); // 8000 + 1000*2
    expect(q.total).toBe(12000); // +20%
  });

  it("VIP A + ROOM: 140分 → セット延長×1 + ROOM延長×1", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 140).toISOString();
    const q = quoteSession({
      plan: "VIP_A",
      startAt: start,
      endAt: end,
      useRoom: true,
    });
    expect(q.subtotal).toBe(42000); // 12000 + 10000 + 10000 + 10000
    expect(q.serviceTax).toBe(8400);
    expect(q.total).toBe(50400);
  });

  it("VIP B + ROOM: 140分 → セット延長×1 + ROOM延長×1", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 140).toISOString();
    const q = quoteSession({
      plan: "VIP_B",
      startAt: start,
      endAt: end,
      useRoom: true,
    });
    expect(q.subtotal).toBe(62000); // 12000 + 20000 + 10000 + 20000
    expect(q.serviceTax).toBe(12400);
    expect(q.total).toBe(74400);
  });

  it("その他料金の合算（例）", () => {
    const start = "2025-08-17T12:00:00.000Z";
    const end = addMin(start, 90).toISOString();
    const q = quoteSession({
      plan: "BAR",
      startAt: start,
      endAt: end,
      nominationCount: 1,
      inhouseCount: 2,
      applyHouseFee: true,
      applySingleCharge: true,
      drinkTotal: 3000,
    });
    expect(q.subtotal).toBe(13000); // 3000 + 1000 + 2000 + 2000 + 2000 + 3000
    expect(q.serviceTax).toBe(2600);
    expect(q.total).toBe(15600);
  });
});
