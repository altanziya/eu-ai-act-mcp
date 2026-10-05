import { describe, expect, it } from "vitest";
import { nodeHash, normalizeText, sha256Hex } from "../../src/parser/normalize.js";

describe("normalizeText", () => {
  it("applies Unicode NFC", () => {
    expect(normalizeText("Jüngling")).toBe("Jüngling");
    expect(normalizeText("é")).toBe("é");
  });

  it("removes soft hyphens and zero-width characters", () => {
    expect(normalizeText("Hoch­risiko")).toBe("Hochrisiko");
    expect(normalizeText("a​b﻿c")).toBe("abc");
  });

  it("collapses all whitespace runs, including non-breaking spaces, to one space", () => {
    expect(normalizeText("EUR 15 000 000")).toBe("EUR 15 000 000");
    expect(normalizeText("  a \t  b c  ")).toBe("a b c");
  });

  it("folds typographic quotes to ASCII quotes", () => {
    expect(normalizeText("‘AI system’")).toBe("'AI system'");
    expect(normalizeText("„KI-System“ und “general”")).toBe('"KI-System" und "general"');
  });

  it("keeps line breaks as block separators and drops empty lines", () => {
    expect(normalizeText("a  b\n\n  c \r\n d")).toBe("a b\nc\nd");
  });

  it("is idempotent", () => {
    const once = normalizeText("‘x’ ­y\n z");
    expect(normalizeText(once)).toBe(once);
  });
});

describe("hashing", () => {
  it("sha256Hex matches the known test vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("nodeHash is stable under typography and whitespace differences", () => {
    const a = nodeHash("Definitions", "‘AI system’ means  a system");
    const b = nodeHash("Definitions ", "'AI system' means a system");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("nodeHash changes when text or heading changes", () => {
    const base = nodeHash("H", "text");
    expect(nodeHash("H", "text2")).not.toBe(base);
    expect(nodeHash("H2", "text")).not.toBe(base);
  });

  it("nodeHash distinguishes empty-text containers by heading", () => {
    expect(nodeHash("GENERAL PROVISIONS", "")).not.toBe(nodeHash("PROHIBITED AI PRACTICES", ""));
  });
});
