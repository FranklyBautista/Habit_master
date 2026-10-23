import { describe, expect, it } from "vitest";

import { compareVersions, parseVersion } from "./version";

describe("parseVersion", () => {
  it("reads major.minor.patch", () => {
    expect(parseVersion("1.10.3")).toEqual([1, 10, 3]);
    expect(parseVersion(" 2.0.0 ")).toEqual([2, 0, 0]);
  });

  it("rejects anything that is not three numbers", () => {
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("1.2.3-beta")).toBeNull();
    expect(parseVersion("")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("compares numerically, not as text", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.9.9", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
  });

  it("treats equal versions as equal", () => {
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
  });

  it("orders an unreadable version before any valid one", () => {
    expect(compareVersions("roto", "0.0.1")).toBeLessThan(0);
    expect(compareVersions("0.0.1", "roto")).toBeGreaterThan(0);
    expect(compareVersions("roto", "otro")).toBe(0);
  });
});
