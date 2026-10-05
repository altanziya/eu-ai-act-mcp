import { describe, expect, it } from "vitest";
import { normalizeVersion, versionNamed } from "../../src/eval/score.js";

describe("versionNamed (descriptive, explicit identifiers only)", () => {
  it("names the Official Journal when only 2024 identifiers appear, whatever is said about the Omnibus", () => {
    expect(versionNamed("Regulation (EU) 2024/1689, CELEX 32024R1689. I cannot confirm whether the Digital Omnibus is in force")).toBe("32024R1689");
    expect(versionNamed("32024R1689 (the Omnibus proposal is not yet in force)")).toBe("32024R1689");
    expect(versionNamed("Official Journal version")).toBe("32024R1689");
    expect(versionNamed("Amtsblatt")).toBe("32024R1689");
  });
  it("names 2026 for a 2026 identifier with amendment wording or the full consolidated id", () => {
    expect(versionNamed("Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744")).toBe("02024R1689-20260727");
    expect(versionNamed("Verordnung (EU) 2024/1689, geändert durch 32026R1744")).toBe("02024R1689-20260727");
    expect(versionNamed("02024R1689-20260727")).toBe("02024R1689-20260727");
  });
  it("both: identifiers of both versions without amendment wording", () => {
    expect(versionNamed("32024R1689 and Regulation 2026/1744")).toBe("both");
  });
  it("keywords alone never count", () => {
    expect(versionNamed("Konsolidierte Fassung")).toBeNull();
    expect(versionNamed("the consolidated version after the omnibus")).toBeNull();
    expect(versionNamed("")).toBeNull();
  });
  it("normalizeVersion keeps its keyword behaviour (used by the scorer)", () => {
    expect(normalizeVersion("Konsolidierte Fassung")).toBe("02024R1689-20260727");
  });
});
