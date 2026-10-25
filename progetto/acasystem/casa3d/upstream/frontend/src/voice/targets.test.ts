import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBuilding, newFloor, type Room } from "../model.ts";
import { showTarget, type Shown } from "./targets.ts";

const room = (id: string, name: string): Room => ({ id, name, area_id: null, points: [], floor_material: "wood" });
const building = {
  ...emptyBuilding(),
  floors: [{ ...newFloor("eg", "Erdgeschoss", 0), rooms: [room("wz", "Wohnzimmer"), room("fl", "Flur"), room("ga", "Garten")] }],
};
const devices: Shown[] = [
  { entity: "camera.haustuer", name: "Kamera Haustür", room: "Flur", camera: true },
  { entity: "camera.garten", name: "Garten Cam", room: "Garten", camera: true },
  { entity: "switch.waschmaschine", name: "Waschmaschine", room: "", camera: false },
  { entity: "light.stehlampe", name: "Stehlampe", room: "Wohnzimmer", camera: false },
  { entity: "light.flur", name: "Flur Licht", room: "Flur", camera: false },
  { entity: "light.wz", name: "Wohnzimmer Decke", room: "Wohnzimmer", camera: false },
];

const t = (s: string) => showTarget(s, building, devices);

test("devices by name, with a word that asks to see them", () => {
  assert.deepEqual(t("Zeig die Waschmaschine"), { kind: "device", entity: "switch.waschmaschine", name: "Waschmaschine", camera: false });
  assert.equal((t("Wo ist die Stehlampe") as { entity: string }).entity, "light.stehlampe");
  // naming a device without asking to see it is for Assist
  assert.equal(t("Flur Licht an"), null);
});

test("cameras: by name, by 'camera' and their room, or all of them", () => {
  assert.equal((t("Zeig die Kamera Haustür") as { entity: string }).entity, "camera.haustuer");
  assert.equal((t("zeig die Kamera im Garten") as { entity: string }).entity, "camera.garten");
  assert.equal(t("Zeig mir die Kameras")?.kind, "cameras");
});

test("rooms stay rooms when a device only shares their name", () => {
  assert.deepEqual(t("Zeig das Wohnzimmer"), { kind: "room", floorId: "eg", roomId: "wz", name: "Wohnzimmer" });
  assert.equal((t("Zeig die Wohnzimmer Decke") as { entity: string }).entity, "light.wz");
  assert.equal(t("Garten")?.kind, "room");
});
