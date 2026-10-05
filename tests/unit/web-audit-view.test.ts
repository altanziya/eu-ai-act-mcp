import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import { auditJson, auditReportMarkdown, kindLabel, KIND_LABEL, orderFindings, segmentText, sourceInfo, uniqueSources } from "../../src/web/auditView.js";
import { EXAMPLES } from "../../src/web/examples.js";

const f = (start: number, end: number, severity: Finding["severity"]): Finding => ({ kind: "reference_ok", severity, span: { start, end }, excerpt: "", message: "", sources: [] });
const release = { releaseId: "aiact-corpus-2026-10-05", manifestSha256: "ab".repeat(32), keyId: "71fa6df7215bb8b9" };

describe("segmentText", () => {
  it("returns the text unchanged when there is nothing to mark", () => {
    expect(segmentText("hello", [])).toEqual([{ text: "hello", findings: [], severity: null }]);
    expect(segmentText("", [])).toEqual([]);
  });
  it("cuts at the spans and the segments always add up to the text", () => {
    const text = "0123456789";
    const segs = segmentText(text, [f(2, 5, "warning"), f(7, 9, "error")]);
    expect(segs.map((s) => [s.text, s.severity])).toEqual([["01", null], ["234", "warning"], ["56", null], ["78", "error"], ["9", null]]);
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });
  it("lets overlapping spans share a segment with the highest severity and lists both findings", () => {
    const segs = segmentText("0123456789", [f(1, 6, "ok"), f(4, 8, "error")]);
    expect(segs.map((s) => [s.text, s.severity, s.findings])).toEqual([["0", null, []], ["123", "ok", [0]], ["45", "error", [0, 1]], ["67", "error", [1]], ["89", null, []]]);
  });
  it("leaves out findings of a severity that is filtered away", () => {
    const segs = segmentText("0123456789", [f(1, 3, "ok"), f(5, 7, "error")], new Set(["error"]));
    expect(segs.filter((s) => s.severity !== null).map((s) => s.text)).toEqual(["56"]);
  });
  it("works on a real audit result: every marked segment is the text of its finding span", () => {
    const ex = EXAMPLES[0]!;
    const r = auditText({ text: ex.text, as_of: "2026-10-05", lang: ex.lang });
    const segs = segmentText(ex.text, r.findings);
    expect(segs.map((s) => s.text).join("")).toBe(ex.text);
    expect(segs.filter((s) => s.severity === "error").length).toBeGreaterThanOrEqual(2);
  });
});

describe("labels and order", () => {
  it("has a plain-language label in both languages for every kind and no raw identifier", () => {
    for (const [kind, pair] of Object.entries(KIND_LABEL)) {
      expect(pair.en).not.toMatch(/_/);
      expect(pair.de).not.toMatch(/_/);
      expect(pair.en).not.toBe(kind);
    }
    expect(kindLabel("outdated_deadline", "en")).toBe("Outdated deadline");
    expect(kindLabel("outdated_deadline", "de")).toBe("Veraltete Frist");
  });
  it("orders errors first, then by position", () => {
    const order = orderFindings([f(30, 31, "ok"), f(20, 21, "error"), f(5, 6, "error"), f(1, 2, "warning")]);
    expect(order.map((o) => o.index)).toEqual([2, 1, 3, 0]);
  });
});

describe("sources and exports", () => {
  const ex = EXAMPLES[0]!;
  const result = auditText({ text: ex.text, as_of: "2026-10-05", lang: "en" });
  it("shows the wording of a source node from the corpus, with its citation", () => {
    const finding = result.findings.find((x) => x.kind === "outdated_deadline")!;
    const infos = uniqueSources(finding).map((s) => sourceInfo(s, loadCorpus, "en"));
    const current = infos.find((i) => i.id === "art_113.sub_3.c.i");
    expect(current).toMatchObject({ version: "02024R1689-20260727", citation: "Article 113, third paragraph, point (c)(i)" });
    expect(current!.text).toMatch(/2027/);
    const removed = result.findings.find((x) => x.kind === "removed_provision")!;
    const src = uniqueSources(removed).map((s) => sourceInfo(s, loadCorpus, "en"));
    expect(src.find((s) => s.id === "art_10.par_5")).toMatchObject({ version: "32024R1689", citation: "Article 10(5)" });
    expect(src.find((s) => s.id === "art_10.par_5")!.text.length).toBeGreaterThan(20);
    expect(sourceInfo("32024R1689:art_999", loadCorpus, "en").text).toBe("");
  });
  it("writes a Markdown report with date, version, release, findings and the disclaimer", () => {
    const md = auditReportMarkdown(result, release, "en");
    expect(md).toContain("2026-10-05");
    expect(md).toContain("consolidated text 2026");
    expect(md).toContain(release.releaseId);
    expect(md).toContain(release.manifestSha256);
    expect(md).toMatch(/- \*\*Error: Outdated deadline\*\*/);
    expect(md).toContain("Not legal advice");
    expect(md).not.toMatch(/outdated_deadline/);
    expect(auditReportMarkdown(result, release, "de")).toMatch(/Veraltete Frist/);
  });
  it("writes the full result as JSON with release id and manifest hash", () => {
    const json = JSON.parse(auditJson(result, release, ex.text, "en")) as { release: { id: string; manifest_sha256: string }; result: typeof result; input: { text: string } };
    expect(json.release).toMatchObject({ id: release.releaseId, manifest_sha256: release.manifestSha256 });
    expect(json.result).toEqual(result);
    expect(json.input.text).toBe(ex.text);
  });
});
