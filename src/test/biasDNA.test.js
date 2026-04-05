import { describe, it, expect } from "vitest";
import {
  BIAS_AXES,
  computeBiasVector,
  computeDNAArchetype,
  buildDNAProfile,
} from "../engine/biasDNA.js";

const FOMO_HISTORY = [
  { round: 1, bias: "FOMO", quality: "POOR" },
  { round: 2, bias: "FOMO", quality: "POOR" },
  { round: 3, bias: "FOMO", quality: "CATASTROPHIC" },
  { round: 4, bias: "Overconfidence", quality: "POOR" },
];

const EMPTY_HISTORY = [];

describe("computeBiasVector", () => {
  it("returns array of length 10 matching BIAS_AXES", () => {
    const vec = computeBiasVector(FOMO_HISTORY);
    expect(vec).toHaveLength(BIAS_AXES.length);
  });

  it("normalises so max value is 1.0", () => {
    const vec = computeBiasVector(FOMO_HISTORY);
    expect(Math.max(...vec)).toBe(1);
  });

  it("FOMO axis is highest for FOMO-heavy history", () => {
    const vec = computeBiasVector(FOMO_HISTORY);
    const fomoIdx = BIAS_AXES.findIndex(a => a.id === "FOMO");
    expect(vec[fomoIdx]).toBe(1);
  });

  it("returns all zeros for empty history", () => {
    const vec = computeBiasVector(EMPTY_HISTORY);
    expect(vec.every(v => v === 0)).toBe(true);
  });

  it("relative value: Overconfidence is 1/3 of FOMO (1 vs 3 counts)", () => {
    const vec = computeBiasVector(FOMO_HISTORY);
    const overIdx = BIAS_AXES.findIndex(a => a.id === "Overconfidence");
    // FOMO=3, Overconfidence=1 → ratio ≈ 0.333
    expect(vec[overIdx]).toBeCloseTo(1 / 3, 5);
  });
});

describe("computeDNAArchetype", () => {
  it("returns default archetype for all-zero vector", () => {
    const vec = new Array(10).fill(0);
    const arch = computeDNAArchetype(vec);
    expect(arch.name).toBe("The Adaptive Strategist");
  });

  it("returns FOMO single archetype when only FOMO fires", () => {
    const vec = new Array(10).fill(0);
    vec[0] = 1; // FOMO is index 0
    const arch = computeDNAArchetype(vec);
    expect(arch.name).toBe("The Fear-Driven Trader");
  });

  it("returns pair archetype for FOMO + Overconfidence", () => {
    const vec = new Array(10).fill(0);
    const fomoIdx = BIAS_AXES.findIndex(a => a.id === "FOMO");
    const overIdx = BIAS_AXES.findIndex(a => a.id === "Overconfidence");
    vec[fomoIdx] = 1;
    vec[overIdx] = 0.8; // above 0.3 threshold
    const arch = computeDNAArchetype(vec);
    expect(arch.name).toBe("The Euphoric Speculator");
  });

  it("ignores second bias when it's below 30% threshold", () => {
    const vec = new Array(10).fill(0);
    const fomoIdx = BIAS_AXES.findIndex(a => a.id === "FOMO");
    const overIdx = BIAS_AXES.findIndex(a => a.id === "Overconfidence");
    vec[fomoIdx] = 1;
    vec[overIdx] = 0.2; // below 0.3 → single bias lookup
    const arch = computeDNAArchetype(vec);
    expect(arch.name).toBe("The Fear-Driven Trader");
  });

  it("returns object with name and desc", () => {
    const vec = new Array(10).fill(0);
    vec[0] = 1;
    const arch = computeDNAArchetype(vec);
    expect(arch).toHaveProperty("name");
    expect(arch).toHaveProperty("desc");
    expect(typeof arch.name).toBe("string");
    expect(typeof arch.desc).toBe("string");
  });
});

describe("buildDNAProfile", () => {
  it("returns vector, dnaArchetype, netDelta, topBiases", () => {
    const profile = buildDNAProfile(FOMO_HISTORY, "B", 50000, 12500);
    expect(profile).toHaveProperty("vector");
    expect(profile).toHaveProperty("dnaArchetype");
    expect(profile).toHaveProperty("netDelta");
    expect(profile).toHaveProperty("topBiases");
  });

  it("computes correct netDelta", () => {
    const profile = buildDNAProfile(FOMO_HISTORY, "B", 50000, 12500);
    expect(profile.netDelta).toBe(37500);
  });

  it("topBiases are sorted by value desc and capped at 3", () => {
    const profile = buildDNAProfile(FOMO_HISTORY, "B", 50000, 12500);
    expect(profile.topBiases.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < profile.topBiases.length; i++) {
      expect(profile.topBiases[i - 1].value).toBeGreaterThanOrEqual(profile.topBiases[i].value);
    }
  });

  it("handles empty biasHistory gracefully", () => {
    const profile = buildDNAProfile([], "A", 200000, 12500);
    expect(profile.topBiases).toHaveLength(0);
    expect(profile.dnaArchetype.name).toBe("The Adaptive Strategist");
  });
});
