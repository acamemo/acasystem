// @vitest-environment node

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAppVersion } from "../config/version.ts";

/** The version of /api/health and of Sistema (REP-20261012-004). */
describe("resolveAppVersion", () => {
  const dir = mkdtempSync(join(tmpdir(), "aca-version-"));
  const pkg = join(dir, "package.json");
  writeFileSync(pkg, JSON.stringify({ version: "0.1.0" }));

  it("takes ACASYSTEM_VERSION of progetto/.env first", () => {
    expect(resolveAppVersion(pkg, { ACASYSTEM_VERSION: " 0.9 " })).toBe("0.9");
  });

  it("falls back to package.json without it, or when it is empty", () => {
    expect(resolveAppVersion(pkg, {})).toBe("0.1.0");
    expect(resolveAppVersion(pkg, { ACASYSTEM_VERSION: "  " })).toBe("0.1.0");
  });

  it("says unknown when package.json cannot be read", () => {
    expect(resolveAppVersion(join(dir, "missing.json"), {})).toBe("unknown");
  });
});
