import assert from "node:assert/strict";
import { test } from "node:test";
import { Director, STOP_MS, doorbellCamera, doorbellEntities, doorbellRang, type Shot } from "./director.ts";
import type { HassEntity, HomeAssistant } from "./types.ts";

function st(entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return { entity_id, state, attributes, last_changed: "", last_updated: "" } as HassEntity;
}

const hass = {
  states: {
    "event.front_ding": st("event.front_ding", "2026-10-17T10:00:00.000Z", { device_class: "doorbell" }),
    "event.button": st("event.button", "2026-10-17T10:00:00.000Z", { device_class: "button" }),
    "binary_sensor.haustuer_visitor": st("binary_sensor.haustuer_visitor", "off", { friendly_name: "Haustür Besucher" }),
    "binary_sensor.motion": st("binary_sensor.motion", "off"),
    "camera.haustuer": st("camera.haustuer", "idle"),
    "camera.garten": st("camera.garten", "idle"),
  },
  entities: {
    "binary_sensor.haustuer_visitor": { entity_id: "binary_sensor.haustuer_visitor", device_id: "dev_door" },
    "camera.haustuer": { entity_id: "camera.haustuer", device_id: "dev_door" },
    "camera.garten": { entity_id: "camera.garten", device_id: "dev_garden", area_id: "garden" },
    "event.front_ding": { entity_id: "event.front_ding", device_id: "dev_ring", area_id: "garden" },
  },
  devices: {},
} as unknown as HomeAssistant;

test("doorbells: event entities of class doorbell and sensors named like one", () => {
  assert.deepEqual(doorbellEntities(hass), ["binary_sensor.haustuer_visitor", "event.front_ding"]);
  assert.deepEqual(doorbellEntities(hass, "event.front_ding"), ["event.front_ding"]);
  assert.deepEqual(doorbellEntities(hass, "event.gone"), []);
});

test("a ring: a new recent time stamp, or a sensor turning on – not a restart", () => {
  const now = Date.parse("2026-10-17T10:00:05.000Z");
  const before = st("event.front_ding", "2026-10-17T09:00:00.000Z");
  assert.equal(doorbellRang(before, st("event.front_ding", "2026-10-17T10:00:00.000Z"), now), true);
  // an old stamp coming back after a restart
  assert.equal(doorbellRang(st("event.front_ding", "unavailable"), st("event.front_ding", "2026-10-17T09:00:00.000Z"), now), false);
  assert.equal(doorbellRang(st("b.x", "off"), st("b.x", "on"), now), true);
  assert.equal(doorbellRang(st("b.x", "unavailable"), st("b.x", "on"), now), false);
  assert.equal(doorbellRang(undefined, st("b.x", "on"), now), false);
});

test("the door camera: chosen, else of the doorbell's device, else in its area", () => {
  const placed = ["camera.haustuer", "camera.garten", "light.x"];
  assert.equal(doorbellCamera(hass, "binary_sensor.haustuer_visitor", placed), "camera.haustuer");
  assert.equal(doorbellCamera(hass, "event.front_ding", placed), "camera.garten");
  assert.equal(doorbellCamera(hass, "event.front_ding", ["camera.haustuer"]), null);
  assert.equal(doorbellCamera(hass, "event.front_ding", placed, "camera.haustuer"), "camera.haustuer");
});

test("edges: the first look only remembers, then a change counts once", () => {
  const d = new Director();
  const on = (a?: HassEntity, c?: HassEntity) => a?.state === "off" && c?.state === "on";
  assert.equal(d.edge("s", st("s", "on"), on), false);
  assert.equal(d.edge("s", st("s", "off"), on), false);
  const up = st("s", "on");
  assert.equal(d.edge("s", up, on), true);
  assert.equal(d.edge("s", up, on), false);
  // an appliance: a short pause is no end, a long rest after a run is – once
  assert.equal(d.stopped("w", false, 0), false);
  assert.equal(d.stopped("w", false, 600_000), false, "never ran while watched");
  assert.equal(d.stopped("w", true, 1_000_000), false);
  assert.equal(d.stopped("w", false, 1_100_000), false);
  assert.equal(d.stopped("w", true, 1_160_000), false, "soaking pause");
  assert.equal(d.stopped("w", false, 2_000_000), false);
  assert.equal(d.resting(), true);
  assert.equal(d.stopped("w", false, 2_000_000 + STOP_MS), true);
  assert.equal(d.stopped("w", false, 2_000_000 + STOP_MS + 1), false);
  assert.equal(d.resting(), false);
});

const bell: Shot = { kind: "doorbell", key: "bell", entity: "event.front_ding", camera: "camera.haustuer" };
const cam: Shot = { kind: "motion", key: "cam", entity: "binary_sensor.motion", camera: "camera.garten" };
const washer: Shot = { kind: "appliance", key: "app:w", entity: "w" };

test("offers: priority, cooldown, someone at the screen", () => {
  const d = new Director();
  assert.equal(d.offer(cam, 0, 30), true);
  // the doorbell wins over motion; motion does not push the doorbell away
  assert.equal(d.offer(bell, 1000, 30), true);
  assert.equal(d.offer({ ...cam, key: "cam2" }, 2000, 30), false);
  // the doorbell holds twice as long
  assert.equal(d.current?.until, 1000 + 60_000);
  // the same camera again soon: not shown again
  assert.equal(d.due(70_000)?.back, true);
  assert.equal(d.offer(cam, 70_000, 30), false);
  // someone uses the screen: quiet shots wait, the doorbell comes anyway
  d.touch(200_000);
  assert.equal(d.offer(washer, 205_000, 30), false);
  assert.equal(d.offer(bell, 206_000, 30), true);
  // touched while shown: the view stays where the person took it
  d.touch(207_000);
  assert.deepEqual(d.due(206_000 + 60_000), { shot: bell, back: false });
  assert.equal(d.due(400_000), null);
});
