import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import { getProvision } from "../../src/tools/getProvision.js";
import { todayIso } from "../../src/tools/today.js";

describe("getProvision follows as_of", () => {
  it("returns the version in force on the reference date, on both sides of 2026-07-27", () => {
    expect(getProvision({ id: "art_4a.par_1", as_of: "2026-07-26" }).found).toBe(false);
    expect(getProvision({ id: "art_4a.par_1", as_of: "2026-07-26" }).version).toBe(V2024);
    expect(getProvision({ id: "art_4a.par_1", as_of: "2026-07-27" }).found).toBe(true);
    expect(getProvision({ id: "art_4a.par_1", as_of: "2026-07-27" }).version).toBe(V2026);
  });
  it("an explicit version wins, and applicability is computed for as_of", () => {
    const r = getProvision({ id: "art_6.par_2", as_of: "2026-10-05", version: V2024 });
    expect(r.version).toBe(V2024);
    expect(r.as_of).toBe("2026-10-05");
    expect(r.applicability).toMatchObject({ state: "in_force_at_as_of", rule_id: "default" });
    expect(getProvision({ id: "art_6.par_2", as_of: "2026-10-05" }).applicability?.until).toBe("2027-12-02");
  });
  it("applicability turns into in_force once the date has passed", () => {
    expect(getProvision({ id: "art_6.par_2", as_of: "2027-12-02" }).applicability?.state).toBe("in_force_at_as_of");
    expect(getProvision({ id: "art_5.par_1", as_of: "2026-10-05" }).applicability?.state).toBe("in_force_at_as_of");
  });
  it("defaults to today and rejects a malformed date", () => {
    expect(getProvision({ id: "art_9" }).as_of).toBe(todayIso());
    expect(() => getProvision({ id: "art_9", as_of: "05.10.2026" })).toThrow(/ISO date/);
  });
  it("a missing node still echoes as_of", () => {
    expect(getProvision({ id: "art_999", as_of: "2026-10-05" })).toMatchObject({ found: false, as_of: "2026-10-05" });
  });
});
