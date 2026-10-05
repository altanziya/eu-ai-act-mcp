import { afterAll, describe, expect, it } from "vitest";
import { canonicalJson, createRecord, decodeRecordFromUrl, encodeRecordForUrl, recordHash } from "../../src/record/record.js";
import type { RecordInput } from "../../src/record/record.js";
import { V2024, V2026 } from "../../src/constants.js";
import { makeRelease, nodeText } from "./helpers/release.js";

const rel = makeRelease("unit-record");
afterAll(() => rel.cleanup());

const QUOTE = nodeText(rel.dir, "art_5.par_1.a");
const input = (over: Partial<RecordInput> = {}): RecordInput => ({
  quote: QUOTE,
  claimed_ref: "art_5.par_1.a",
  as_of: "2026-09-01",
  lang: "en",
  created_at: "2026-10-05T12:00:00+02:00",
  release_id: "unit-record",
  ...over,
});

describe("canonicalJson", () => {
  it("sorts keys recursively, keeps array order, has no whitespace", () => {
    expect(canonicalJson({ b: [3, 1, { y: 1, x: 2 }], a: null })).toBe('{"a":null,"b":[3,1,{"x":2,"y":1}]}');
  });
  it("does not escape Unicode and escapes quotes and control characters like JSON", () => {
    expect(canonicalJson({ k: "Ärger – “x” \n ü" })).toBe('{"k":"Ärger – “x” \\n ü"}');
  });
  it("is independent of insertion order and omits undefined members", () => {
    expect(canonicalJson({ a: 1, b: 2, c: undefined })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});

describe("canonicalJson as documented in the README", () => {
  it("does not normalise Unicode: NFC and NFD forms give different text and different hashes", () => {
    const nfc = "Gr\u00f6\u00dfe \u00dcbung";
    const nfd = nfc.normalize("NFD");
    expect(nfd).not.toBe(nfc);
    expect(canonicalJson({ question: nfc })).not.toBe(canonicalJson({ question: nfd }));
    expect(canonicalJson({ question: nfd })).toBe(`{"question":"${nfd}"}`);
  });
  it("sorts keys by UTF-16 code units, not by code point", () => {
    // U+1F600 is the surrogate pair D83D DE00 and sorts before U+FF21 by code units, after it by code point.
    expect(canonicalJson({ "\uff21": 1, "\u{1f600}": 2 })).toBe('{"\u{1f600}":2,"\uff21":1}');
  });
  it("hashes a record with umlauts over the UTF-8 bytes of its canonical JSON", () => {
    const r = createRecord(input({ question: "F\u00e4llt das unter Art. 5? Gr\u00f6\u00dfe 3,50 \u20ac", creator: "J\u00fcrgen \u00c4rmel" }), rel.ctx);
    const { record_hash, ...body } = r;
    expect(canonicalJson(body)).toContain("F\u00e4llt das unter Art. 5? Gr\u00f6\u00dfe 3,50 \u20ac");
    expect(record_hash).toBe(recordHash(body));
    expect(record_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("evidence record", () => {
  it("has null for missing optional fields and the full notices", () => {
    const r = createRecord(input(), rel.ctx);
    expect(r.question).toBeNull();
    expect(r.creator).toBeNull();
    const noRef = createRecord(input({ claimed_ref: undefined }), rel.ctx);
    expect(noRef.input.claimed_ref).toBeNull();
    expect(r.notice.de).toMatch(new RegExp(V2024));
    expect(r.notice.en).toMatch(new RegExp(V2026));
  });
  it("record_hash is stable across calls and independent of key order, and changes with any field", () => {
    const r = createRecord(input(), rel.ctx);
    const { record_hash, ...body } = r;
    expect(createRecord(input(), rel.ctx).record_hash).toBe(record_hash);
    const reordered = Object.fromEntries(Object.entries(body).reverse()) as typeof body;
    expect(recordHash(reordered)).toBe(record_hash);
    expect(recordHash({ ...body, created_at: "2026-10-05T12:00:01+02:00" })).not.toBe(record_hash);
    expect(recordHash({ ...body, question: "other" })).not.toBe(record_hash);
  });
  it("enforces the input limits: question 2000, creator 200, quote 5000 characters", () => {
    expect(() => createRecord(input({ question: "q".repeat(2001) }), rel.ctx)).toThrow("question is too long: 2001 characters, at most 2000 are allowed");
    expect(() => createRecord(input({ creator: "c".repeat(201) }), rel.ctx)).toThrow("creator is too long: 201 characters, at most 200 are allowed");
    expect(() => createRecord(input({ quote: "w ".repeat(2501) }), rel.ctx)).toThrow("quote is too long: 5002 characters, at most 5000 are allowed");
    expect(createRecord(input({ question: "q".repeat(2000), creator: "c".repeat(200) }), rel.ctx).question).toHaveLength(2000);
    expect(createRecord(input({ quote: "w ".repeat(2500) }), rel.ctx).input.quote).toHaveLength(5000);
  });
  it("rejects a record for another release id", () => {
    expect(() => createRecord(input({ release_id: "other" }), rel.ctx)).toThrow(/release_id/);
  });
  it("lists the matched node once in cited_nodes", () => {
    const r = createRecord(input(), rel.ctx);
    expect(r.cited_nodes.filter((c) => c.id === "art_5.par_1.a")).toHaveLength(1);
  });
  it("a quote that is only in the other language cites the node with the language it was found in", () => {
    const de = nodeText(rel.dir, "art_5.par_1.a", "de");
    const r = createRecord(input({ quote: de, lang: "en" }), rel.ctx);
    expect(r.result.status).toBe("found_other_language");
    expect(r.cited_nodes.some((c) => c.id === "art_5.par_1.a" && c.lang === "de")).toBe(true);
  });
  it("a not_found record has no cited nodes", () => {
    const r = createRecord(input({ quote: "this sentence does not occur anywhere in the regulation text at all", claimed_ref: undefined }), rel.ctx);
    expect(r.result.status).toBe("not_found");
    expect(r.cited_nodes).toEqual([]);
  });
});

describe("record url encoding", () => {
  it("round-trips non-ASCII text and accepts a leading #", () => {
    const r = createRecord(input({ question: "Ist das „verboten“? Größe – 日本語 🙂" }), rel.ctx);
    const enc = encodeRecordForUrl(r);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRecordFromUrl(enc)).toEqual(r);
    expect(decodeRecordFromUrl(`#${enc}`).question).toBe(r.question);
  });
  it("rejects garbage and JSON of another schema", () => {
    expect(() => decodeRecordFromUrl("!!!")).toThrow();
    expect(() => decodeRecordFromUrl(Buffer.from('{"schema":"x"}').toString("base64url"))).toThrow(/not an/);
    expect(() => decodeRecordFromUrl("")).toThrow();
  });
});
