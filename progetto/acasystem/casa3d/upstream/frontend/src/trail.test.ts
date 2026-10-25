import assert from "node:assert/strict";
import { test } from "node:test";
import { newFloor, type Building } from "./model.ts";
import { trailEvents, trailPoints, trailSources } from "./trail.ts";
import type { HomeAssistant } from "./types.ts";

const MIN = 60000;
const NOW = 1_700_000_000_000;

function hassWith(): HomeAssistant {
  const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) => ({ entity_id, state, attributes });
  return {
    language: "de",
    connection: {} as HomeAssistant["connection"],
    callWS: async () => undefined as never,
    callService: async () => undefined,
    areas: { flur: { area_id: "flur", name: "Flur" } },
    devices: { cam: { id: "cam" } },
    entities: {
      "binary_sensor.flur_bewegung": { entity_id: "binary_sensor.flur_bewegung", area_id: "flur" },
      "binary_sensor.flur_tuer": { entity_id: "binary_sensor.flur_tuer", area_id: "flur" },
      "camera.wohnen": { entity_id: "camera.wohnen", device_id: "cam" },
      "binary_sensor.wohnen_motion": { entity_id: "binary_sensor.wohnen_motion", device_id: "cam" },
      "binary_sensor.kueche_presence": { entity_id: "binary_sensor.kueche_presence" },
    },
    states: {
      "binary_sensor.flur_bewegung": st("binary_sensor.flur_bewegung", "off", { device_class: "motion" }),
      "binary_sensor.flur_tuer": st("binary_sensor.flur_tuer", "off", { device_class: "door" }),
      "camera.wohnen": st("camera.wohnen", "idle"),
      "binary_sensor.wohnen_motion": st("binary_sensor.wohnen_motion", "on", { device_class: "motion" }),
      "binary_sensor.kueche_presence": st("binary_sensor.kueche_presence", "off", { device_class: "presence" }),
    },
  };
}

function building(): Building {
  const floor = newFloor("eg", "EG", 0);
  floor.rooms.push({
    id: "flur",
    name: "Flur",
    area_id: "flur",
    points: [
      [0, 0],
      [4, 0],
      [4, 2],
      [0, 2],
    ],
  } as Building["floors"][number]["rooms"][number]);
  floor.placements.push({ entity_id: "camera.wohnen", x: 6, z: 1, y: null, rotation: 90 }, { entity_id: "binary_sensor.kueche_presence", x: 8, z: 3, y: null });
  return { version: 1, settings: { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05 }, floors: [floor], energy: {}, presence: [] } as unknown as Building;
}

test("trail sources: placed sensors, a camera's motion sensor at the camera, area sensors at the room's centre", () => {
  const sources = trailSources(hassWith(), building());
  assert.deepEqual(
    sources.map((s) => [s.entity, s.x, s.z]),
    [
      ["binary_sensor.wohnen_motion", 6, 1],
      ["binary_sensor.kueche_presence", 8, 3],
      ["binary_sensor.flur_bewegung", 2, 1],
    ],
  );
});

test("trail events: every off→on change in the window, a live 'on' once, in time order", () => {
  const s = (t: number) => (NOW - t) / 1000;
  const rows = {
    "binary_sensor.a": [
      { s: "on", lu: s(40 * MIN) }, // too old
      { s: "off", lu: s(20 * MIN) },
      { s: "on", lu: s(10 * MIN) },
      { s: "on", lu: s(9 * MIN) }, // still on: no new event
      { s: "off", lu: s(8 * MIN) },
    ],
    "binary_sensor.b": [{ s: "on", lu: s(15 * MIN), lc: s(14 * MIN) }],
  };
  const events = trailEvents(rows, [{ entity: "binary_sensor.b", state: "on", lastChanged: NOW - 14 * MIN }, { entity: "binary_sensor.c", state: "on", lastChanged: NOW - 3 * MIN }], NOW);
  assert.deepEqual(
    events.map((e) => [e.entity, (NOW - e.time) / MIN]),
    [
      ["binary_sensor.b", 14],
      ["binary_sensor.a", 10],
      ["binary_sensor.c", 3],
    ],
  );
});

test("trail points: placed in the plan, repeats within a minute merged, age from 0 to 1", () => {
  const sources = [
    { entity: "binary_sensor.a", floorId: "eg", x: 1, z: 1 },
    { entity: "binary_sensor.b", floorId: "eg", x: 5, z: 1 },
  ];
  const events = [
    { entity: "binary_sensor.a", time: NOW - 30 * MIN },
    { entity: "binary_sensor.a", time: NOW - 29.5 * MIN }, // same sensor half a minute later
    { entity: "binary_sensor.b", time: NOW - 15 * MIN },
    { entity: "binary_sensor.zzz", time: NOW - 10 * MIN }, // no spot in the plan
    { entity: "binary_sensor.a", time: NOW },
  ];
  const points = trailPoints(sources, events, NOW);
  assert.deepEqual(
    points.map((p) => [p.entity, p.x, p.age]),
    [
      ["binary_sensor.a", 1, 1],
      ["binary_sensor.b", 5, 0.5],
      ["binary_sensor.a", 1, 0],
    ],
  );
});
