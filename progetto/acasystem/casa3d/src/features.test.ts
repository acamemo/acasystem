import assert from "node:assert/strict";
import { test } from "node:test";
import { hasFeature, unlockedFeatures } from "./features.ts";

test("features come from installed packs that list them; unknown names are ignored", () => {
  assert.deepEqual([...unlockedFeatures([])], []);
  const packs = [{ features: ["weather", "teleport"] }, { features: undefined }, { features: ["camera_cockpit"] }];
  assert.deepEqual([...unlockedFeatures(packs)].sort(), ["camera_cockpit", "weather"]);
  assert.equal(hasFeature("screens", [{ features: ["screens"] }]), true);
  assert.equal(hasFeature("screens", [{ features: ["screens"] }]), true);
  assert.equal(hasFeature("weather", [{ features: ["weather"] }]), true);
  assert.equal(hasFeature("camera_cockpit", [{ features: ["weather"] }]), false);
});

test("time travel is a Pro add-on of its own", () => {
  assert.equal(hasFeature("time_travel", [{ features: ["time_travel"] }]), true);
  assert.equal(hasFeature("time_travel", [{ features: ["energy_pro"] }]), false);
});

test("an unreleased add-on shows only to whoever has its pack", async () => {
  const { released, UNRELEASED } = await import("./features.ts");
  const { setPacks } = await import("./packs.ts");
  assert.ok(UNRELEASED.includes("pool"));
  setPacks([]);
  assert.equal(released("pool"), false);
  assert.equal(released("auto_pro"), true);
  setPacks([{ id: "casa3d.pro_pool", name: "Pro: Pool Pro", items: [], features: ["pool"] } as never]);
  assert.equal(released("pool"), true);
  setPacks([]);
});
