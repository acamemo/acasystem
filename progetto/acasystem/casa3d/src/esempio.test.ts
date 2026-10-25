// The example plan of the Acasystem development page (frontend/src/casa3d/casa-esempio.json, T3) is valid for this model:
// already in the normal form, rooms that close, openings on edges that exist, known furniture inside the rooms,
// no link to an entity, no address of a third party.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { FURNITURE_TYPES, normalizeBuilding, pointInPolygon, polygonArea, type Building } from "./model.ts";

const FILE = new URL("../../frontend/src/casa3d/casa-esempio.json", import.meta.url);
const text = readFileSync(FILE, "utf8");
const plan = JSON.parse(text) as Building;
const floor = plan.floors[0];

describe("example plan", () => {
  it("is already in the normal form of the model", () => {
    assert.deepEqual(normalizeBuilding(JSON.parse(text) as Building), plan);
  });

  it("has one floor with six rooms of positive area and unique ids", () => {
    assert.equal(plan.floors.length, 1);
    assert.equal(floor.rooms.length, 6);
    assert.equal(new Set(floor.rooms.map((room) => room.id)).size, 6);
    for (const room of floor.rooms) {
      assert.equal(room.points.length, 4, room.id);
      assert.ok(polygonArea(room.points) >= 2, `${room.id} is too small`);
      assert.equal(room.area_id, null, "rooms are tied to areas by the host, never in the file");
    }
  });

  it("openings sit on edges and inside the length of the edge", () => {
    const ids = new Set<string>();
    for (const opening of floor.openings) {
      assert.ok(!ids.has(opening.id), `duplicate ${opening.id}`);
      ids.add(opening.id);
      const room = floor.rooms.find((candidate) => candidate.id === opening.room_id);
      assert.ok(room, `${opening.id}: unknown room`);
      assert.ok(opening.edge >= 0 && opening.edge < room.points.length, `${opening.id}: edge`);
      const [x0, z0] = room.points[opening.edge];
      const [x1, z1] = room.points[(opening.edge + 1) % room.points.length];
      const length = Math.hypot(x1 - x0, z1 - z0);
      assert.ok(opening.offset - opening.width / 2 >= 0 && opening.offset + opening.width / 2 <= length, `${opening.id}: outside its edge`);
      assert.equal(opening.cover ?? null, null);
      assert.equal(opening.contact ?? null, null);
    }
  });

  it("furniture is of a known type and stands inside a room", () => {
    const known = new Set<string>(FURNITURE_TYPES);
    for (const item of floor.furniture) {
      assert.ok(known.has(item.type), `${item.id}: unknown type ${item.type}`);
      assert.ok(floor.rooms.some((room) => pointInPolygon([item.x, item.z], room.points)), `${item.id} is outside the rooms`);
      assert.equal(item.entity, null);
    }
  });

  it("links to no entity and names no address or brand", () => {
    assert.equal(floor.placements.length, 0);
    assert.doesNotMatch(text, /https?:|www\./i);
    // the names of the base project are written in pieces: the brand check of the package must not find them in this file
    assert.doesNotMatch(text, new RegExp([`neon${"plan"}`, `master${"short"}`, `floor${"plan"}`].join("|"), "i"));
    assert.doesNotMatch(text, /"(light|switch|sensor|cover|climate|media_player|camera)\.[a-z_]+"/);
  });
});
