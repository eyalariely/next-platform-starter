import { describe, expect, it } from "vitest";

import { calculatePerformanceBySecurity } from "@/lib/financial/performance-contribution";

describe("calculatePerformanceBySecurity", () => {
  it("computes return % relative to invested capital", () => {
    const rows = calculatePerformanceBySecurity(
      [{ securityId: "A", weight: 0.5, investedCapitalBase: 1000, totalPnLBase: 200 }],
      200,
    );
    expect(rows[0].returnPct).toBeCloseTo(0.2, 6);
  });

  it("computes each security's share of total portfolio P/L", () => {
    const rows = calculatePerformanceBySecurity(
      [
        { securityId: "A", weight: 0.6, investedCapitalBase: 1000, totalPnLBase: 300 },
        { securityId: "B", weight: 0.4, investedCapitalBase: 500, totalPnLBase: -100 },
      ],
      200, // net portfolio P/L
    );
    const a = rows.find((r) => r.securityId === "A")!;
    const b = rows.find((r) => r.securityId === "B")!;
    expect(a.contributionToTotalPnL).toBeCloseTo(1.5, 6); // 300/200
    expect(b.contributionToTotalPnL).toBeCloseTo(-0.5, 6); // -100/200
    // Contributions should sum back to the whole (100%).
    expect(a.contributionToTotalPnL! + b.contributionToTotalPnL!).toBeCloseTo(1, 6);
  });

  it("returns null rather than a fabricated number when portfolio total P/L is ~0", () => {
    const rows = calculatePerformanceBySecurity(
      [{ securityId: "A", weight: 0.5, investedCapitalBase: 1000, totalPnLBase: 50 }],
      0,
    );
    expect(rows[0].contributionToTotalPnL).toBeNull();
  });

  it("returns null return% when there is no cost basis", () => {
    const rows = calculatePerformanceBySecurity(
      [{ securityId: "A", weight: null, investedCapitalBase: 0, totalPnLBase: null }],
      100,
    );
    expect(rows[0].returnPct).toBeNull();
    expect(rows[0].contributionToTotalPnL).toBeNull();
  });
});
