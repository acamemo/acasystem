// Commands (T7): the elements of the view never call the browser's confirm(); a device marked «ask first» is passed to the host as
// callService(domain, service, data, { ask: true }) and the host asks with its own dialog (frontend/src/casa3d/commandPath.ts).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { toggleEntity } from "./markers.ts";
import type { HomeAssistant } from "./types.ts";

type Call = { domain: string; service: string; data?: Record<string, unknown>; options?: { ask?: boolean } };

function fakeHass(calls: Call[]): HomeAssistant {
  return {
    language: "it",
    states: {},
    connection: { subscribeMessage: () => Promise.resolve(() => Promise.resolve()) },
    callWS: () => Promise.reject(new Error("no")),
    callService: (domain, service, data, options) => {
      calls.push({ domain, service, data, options });
      return Promise.resolve();
    },
  };
}

describe("commands ask through the host", () => {
  it("toggleEntity sends the toggle of the domain, with ask only when the device is marked so", async () => {
    const calls: Call[] = [];
    const hass = fakeHass(calls);
    await toggleEntity(hass, "light.sala");
    await toggleEntity(hass, "switch.pompa", true);
    assert.deepEqual(calls, [
      { domain: "light", service: "toggle", data: { entity_id: "light.sala" }, options: undefined },
      { domain: "switch", service: "toggle", data: { entity_id: "switch.pompa" }, options: { ask: true } },
    ]);
  });

  it("the elements of the view (not the editor) contain no call to confirm()", () => {
    const base = fileURLToPath(new URL(".", import.meta.url));
    for (const file of ["components/view3d.ts", "components/quick-menu.ts", "components/room-panel.ts", "markers.ts"]) {
      const text = readFileSync(base + file, "utf8");
      assert.equal(/(?<![\w.])confirm\(/.test(text), false, `${file} calls confirm()`);
    }
  });
});
