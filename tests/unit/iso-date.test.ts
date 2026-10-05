import { describe, expect, it } from "vitest";
import { isIsoDate } from "../../src/tools/corpus.js";
import { aiactSearchWith } from "../../src/tools/searchCore.js";
import { auditTextWith } from "../../src/tools/auditCore.js";
import { getProvision } from "../../src/tools/getProvision.js";

describe("isIsoDate", () => {
  it("accepts real calendar dates, including leap days", () => {
    for (const d of ["2026-10-05", "2026-07-27", "2028-02-29", "2026-12-31", "2000-02-29"]) expect(isIsoDate(d), d).toBe(true);
  });
  it("rejects impossible days and months and other formats", () => {
    for (const d of ["2026-02-30", "2026-09-31", "2026-04-31", "2027-02-29", "1900-02-29", "2026-13-01", "2026-00-10", "2026-01-00", "2026-1-5", "5 May 2026", "", "2026-10-05T00:00:00Z"]) expect(isIsoDate(d), d).toBe(false);
  });
  it("existing callers reject impossible dates too", () => {
    expect(() => getProvision({ id: "art_6", as_of: "2026-02-30" })).toThrow(/as_of/);
    expect(() => aiactSearchWith({ query: "x", as_of: "2026-09-31" }, (() => { throw new Error("no"); }) as never, { versions: {} })).toThrow(/as_of/);
    expect(() => auditTextWith({ text: "x", as_of: "2026-09-31" }, (() => { throw new Error("no"); }) as never, { versions: {} })).toThrow(/as_of/);
  });
});
