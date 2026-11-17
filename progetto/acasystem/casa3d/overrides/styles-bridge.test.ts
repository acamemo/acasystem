import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { tokens, controls } from "./styles.ts";

const original = readFileSync(new URL("../upstream/frontend/src/styles.ts", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../../design/themes/acasystem/tokens.css", import.meta.url), "utf8");
const originalCss = (name: string) => original.split(`export const ${name} = css\``)[1]?.split("`;")[0] ?? "";
const normalized = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();

/** Resolve only the ACA fallbacks, as when the elements have no ACA host. */
function standalone(text: string): string {
  let result = text;
  for (;;) {
    const match = /var\(--aca-[\w-]+,\s*/.exec(result);
    if (!match) return result;
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    for (; end < result.length; end++) {
      if (result[end] === "(") depth++;
      if (result[end] === ")" && --depth === 0) break;
    }
    assert.equal(depth, 0, "unbalanced fallback");
    result = result.slice(0, match.index) + result.slice(start, end) + result.slice(end + 1);
  }
}

describe("Casa 3D shared design contract", () => {
  it("every ACA token read inside Shadow DOM exists in the canonical theme", () => {
    const read = new Set([...`${tokens.cssText}\n${controls.cssText}`.matchAll(/var\((--aca-[\w-]+)/g)].map((match) => match[1]));
    assert.ok(read.size > 0);
    for (const token of read) assert.match(canonical, new RegExp(`${token}\\s*:`), `${token} is missing from the shared theme`);
  });

  it("preserves the standalone token values when no ACA host is present", () => {
    assert.equal(normalized(standalone(tokens.cssText)), normalized(originalCss("tokens")));
  });

  it("preserves standalone controls, dimensions and touch targets without ACA tokens", () => {
    assert.equal(normalized(standalone(controls.cssText)), normalized(originalCss("controls")));
  });
});
