import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import { EXAMPLES } from "../../src/web/examples.js";

const run = (id: string) => {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) throw new Error(`no example ${id}`);
  return auditText({ text: ex.text, as_of: "2026-10-05", lang: ex.lang });
};
const kinds = (id: string): string[] => run(id).findings.map((f) => f.kind);

describe("document checker examples (as of 2026-10-05)", () => {
  it("vendor answer: outdated Annex III deadline and removed Article 10(5); the Article 50 date and the quotation are correct", () => {
    const r = run("vendor");
    expect(kinds("vendor")).toEqual(expect.arrayContaining(["outdated_deadline", "removed_provision", "deadline_ok", "quote_ok"]));
    expect(r.findings.find((f) => f.kind === "outdated_deadline")).toMatchObject({ found: "2026-08-02", expected: "2027-12-02" });
    expect(r.findings.find((f) => f.kind === "removed_provision")?.ref).toBe("Article 10(5)");
    expect(r.summary).toMatchObject({ error: 2, warning: 0 });
  });
  it("company policy (German): outdated deadline and outdated quotation of Article 57(1)", () => {
    expect(kinds("policy")).toEqual(expect.arrayContaining(["outdated_deadline", "outdated_quote"]));
    expect(run("policy").findings.find((f) => f.kind === "outdated_deadline")?.expected).toBe("2027-12-02");
  });
  it("LinkedIn post: Article 999 does not exist and the quotation is slightly altered", () => {
    expect(kinds("post")).toEqual(expect.arrayContaining(["unknown_provision", "quote_deviates"]));
  });
  it("every finding span points into its text", () => {
    for (const ex of EXAMPLES) {
      for (const f of run(ex.id).findings) {
        expect(f.span.end).toBeLessThanOrEqual(ex.text.length);
        expect(ex.text.slice(f.span.start, f.span.end).length).toBeGreaterThan(0);
      }
    }
  });
});
