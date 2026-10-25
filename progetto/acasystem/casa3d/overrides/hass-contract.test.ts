// The contract with the Acasystem frontend (T3): the read-only hass object that frontend/src/casa3d/haShim.ts builds is the
// one this package expects. The type check below fails the build when the two drift apart; the scan fails when the copied
// sources start reading a part of `hass` that the adapter does not give (e.g. after a new revision of the base is brought over).
// The scan sees only top-level members written as `hass.X` / `hass?.X`: nested members, aliases, destructuring and casts are not
// checked. Known gap: voice/listen.ts reads `connection.socket`, which the adapter leaves out on purpose (voice is outside T3).

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { Casa3dContextEvent, Casa3dHass, Casa3dStats } from "../../frontend/src/casa3d/contract.ts";
import type { HomeAssistant } from "./types.ts";
import type { ContextEvent, ViewerStats } from "./viewer/viewer3d.ts";

/** Compile-time proof: what the adapter builds can be handed to the elements. */
export const asBundleHass = (hass: Casa3dHass): HomeAssistant => hass;

/** Compile-time proof (T5): what the view reports (statistics, state of the drawing context) is what the host reads. */
export const asHostStats = (stats: ViewerStats): Casa3dStats => stats;
export const asHostContext = (event: ContextEvent): Casa3dContextEvent => event;

/** The parts of `hass` the adapter provides. */
const PROVIDED = new Set(["language", "user", "areas", "floors", "entities", "devices", "states", "config", "connection", "callWS", "callService"]);
/** Optional extras the code reaches through a cast and checks for: the adapter leaves them out on purpose, so those code paths stay off. */
const ABSENT_ON_PURPOSE = ["callApi", "callApiRaw", "fetchWithAuth", "sendWS"];

const SRC = fileURLToPath(new URL(".", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("contract with the Acasystem adapter", () => {
  it("the sources read only parts of hass that the adapter provides", () => {
    const used = new Map<string, string>();
    for (const file of sources(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?<![\w/-])hass\??\.([A-Za-z_]+)/g)) {
        if (!used.has(match[1])) used.set(match[1], file.slice(SRC.length));
      }
    }
    const missing = [...used].filter(([name]) => !PROVIDED.has(name));
    assert.deepEqual(missing, [], "the adapter (frontend/src/casa3d/haShim.ts) and contract.ts must provide these");
  });

  it("the extras the adapter leaves out are used only where the code checks for them", () => {
    // household.ts reads callApi through an optional member and does nothing without it; nothing else may start using them unnoticed.
    const users = new Set<string>();
    for (const file of sources(SRC)) {
      const text = readFileSync(file, "utf8");
      if (ABSENT_ON_PURPOSE.some((name) => new RegExp(`\\b${name}\\b`).test(text))) users.add(file.slice(SRC.length).replaceAll("\\", "/"));
    }
    assert.deepEqual([...users].sort(), ["household.ts", "timetravel/replay-hass.ts"]);
  });
});
