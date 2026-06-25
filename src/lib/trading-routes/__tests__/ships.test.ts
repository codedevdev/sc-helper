import { describe, expect, it } from "vitest";
import {
  buildFullShipListFromUex,
  inferQuantumSpeedClass,
  TRADING_SHIPS,
} from "@/lib/trading-routes/ships";

describe("inferQuantumSpeedClass", () => {
  it("classifies small ships as starter", () => {
    expect(inferQuantumSpeedClass("Aurora CL", 6)).toBe("starter");
    expect(inferQuantumSpeedClass("Nomad", 24)).toBe("starter");
  });

  it("classifies haulers by name", () => {
    expect(inferQuantumSpeedClass("C2 Hercules", 696)).toBe("hauler");
    expect(inferQuantumSpeedClass("Hull C", 4608)).toBe("hauler");
    expect(inferQuantumSpeedClass("Caterpillar", 576)).toBe("hauler");
  });

  it("classifies fast ships", () => {
    expect(inferQuantumSpeedClass("Mercury Star Runner", 114)).toBe("fast");
    expect(inferQuantumSpeedClass("Hull A", 64)).toBe("fast");
  });

  it("defaults to standard for mid-size unknown ships", () => {
    expect(inferQuantumSpeedClass("Cutlass Black", 46)).toBe("standard");
  });
});

describe("buildFullShipListFromUex", () => {
  it("merges static ships and preserves quantum class", () => {
    const list = buildFullShipListFromUex([
      { name: "Cutlass Black", slug: "cutlass-black", scu: 46 },
      { name: "C2 Hercules", slug: "c2-hercules", scu: 696 },
    ]);

    const cutlass = list.find((s) => s.name === "Cutlass Black");
    const c2 = list.find((s) => s.name === "C2 Hercules");
    expect(cutlass?.quantumSpeedClass).toBe("standard");
    expect(c2?.quantumSpeedClass).toBe("hauler");
  });

  it("adds unknown UEX ships with inferred class", () => {
    const list = buildFullShipListFromUex([
      { name: "MISC Fortune", slug: "misc-fortune", scu: 120 },
    ]);

    expect(list.some((s) => s.name === "MISC Fortune")).toBe(true);
    expect(list.find((s) => s.name === "MISC Fortune")?.quantumSpeedClass).toBe("standard");
  });

  it("deduplicates by slug", () => {
    const list = buildFullShipListFromUex([
      { name: "Cutlass Black", slug: "cutlass-black", scu: 46 },
      { name: "Cutlass Black Mk II", slug: "cutlass-black", scu: 50 },
    ]);

    expect(list.filter((s) => s.uexSlug === "cutlass-black")).toHaveLength(1);
  });

  it("sorts by SCU ascending", () => {
    const list = buildFullShipListFromUex([
      { name: "Hull C", slug: "hull-c", scu: 4608 },
      { name: "Aurora CL", slug: "aurora-cl", scu: 6 },
    ]);

    expect(list[0].scu).toBeLessThanOrEqual(list[1].scu);
  });

  it("falls back to static list when input is empty", () => {
    const list = buildFullShipListFromUex([]);
    expect(list).toEqual(TRADING_SHIPS);
  });
});
