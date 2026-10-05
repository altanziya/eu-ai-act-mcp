import { describe, expect, it } from "vitest";
import { annexId, articleId, articleSuffix, childSegment, chapterId, joinId, labelCore, recitalId, romanToInt, sectionId } from "../../src/parser/ids.js";

describe("logical IDs", () => {
  it("builds ids for the main node kinds", () => {
    expect(recitalId(12)).toBe("rec_12");
    expect(articleId("50")).toBe("art_50");
    expect(articleId("4a")).toBe("art_4a");
    expect(annexId(3)).toBe("anx_3");
    expect(sectionId(chapterId(3), 2)).toBe("cpt_3.sct_2");
  });

  it("treats letter-suffixed articles as their own article, not as part of the base article", () => {
    expect(articleSuffix("art_4a")).toBe("4a");
    expect(articleSuffix("art_75a")).toBe("75a");
    expect(articleSuffix("art_4")).toBe("4");
    expect(articleSuffix("art_4a.tit_1")).toBeNull();
    expect(articleSuffix("art_4a")).not.toBe(articleSuffix("art_4"));
  });

  it("converts roman numerals", () => {
    expect(romanToInt("I")).toBe(1);
    expect(romanToInt("IV")).toBe(4);
    expect(romanToInt("IX")).toBe(9);
    expect(romanToInt("XIII")).toBe(13);
    expect(romanToInt("XIV")).toBe(14);
    expect(Number.isNaN(romanToInt("a"))).toBe(true);
  });

  it("reduces list labels to their core", () => {
    expect(labelCore("(a)")).toBe("a");
    expect(labelCore("a)")).toBe("a");
    expect(labelCore("1.")).toBe("1");
    expect(labelCore("(12)")).toBe("12");
    expect(labelCore("(ba)")).toBe("ba");
    expect(labelCore("1a.")).toBe("1a");
    expect(labelCore("3.1.")).toBe("3.1");
    expect(labelCore("—")).toBe("");
  });

  it("derives path segments: paragraphs, points, letters, roman numerals, bullets", () => {
    expect(childSegment("1", true, 0)).toBe("par_1");
    expect(childSegment("1a", true, 0)).toBe("par_1a");
    expect(childSegment("1", false, 0)).toBe("pt_1");
    expect(childSegment("a", false, 0)).toBe("a");
    expect(childSegment("ii", false, 0)).toBe("ii");
    expect(childSegment("3.1", false, 0)).toBe("pt_3-1");
    expect(childSegment("", false, 4)).toBe("pt_4");
    expect(joinId(joinId("art_50", "par_1"), "a")).toBe("art_50.par_1.a");
  });
});
