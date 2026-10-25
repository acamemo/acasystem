import assert from "node:assert/strict";
import { test } from "node:test";
import { readDxf, guessRole } from "./dxf.ts";
import { readValetudo, isValetudo } from "./valetudo.ts";
import { readFloorplanner, isFloorplanner } from "./floorplanner.ts";
import { buildPlan } from "./builder.ts";
import { faces, bridgeGaps, traceCells, cleanPolygon } from "./geom.ts";
import { furnitureType } from "./furniture-map.ts";
import { polygonArea } from "../model.ts";

// a DXF in millimetres without a units header: walls drawn as their two faces, a 900 mm door gap in the inner wall,
// room names as texts
function dxf(): string {
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const poly = (layer: string, pts: number[][], closed: boolean) => {
    out.push("0", "LWPOLYLINE", "8", layer, "90", String(pts.length), "70", closed ? "1" : "0");
    for (const [x, y] of pts) out.push("10", String(x), "20", String(y));
  };
  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => out.push("0", "LINE", "8", layer, "10", String(x1), "20", String(y1), "11", String(x2), "21", String(y2));
  // outer face, inner face of the outer walls (y up in DXF)
  poly("A-WALL", [[-150, -150], [10150, -150], [10150, 8150], [-150, 8150]], true);
  poly("A-WALL", [[150, 150], [9850, 150], [9850, 7850], [150, 7850]], true);
  // the inner wall's two faces with the door gap 3550…4450
  line("A-WALL", 5940, 150, 5940, 3550);
  line("A-WALL", 5940, 4450, 5940, 7850);
  line("A-WALL", 6060, 150, 6060, 3550);
  line("A-WALL", 6060, 4450, 6060, 7850);
  // a dimension that must be ignored
  line("BEMASSUNG", -1000, -1000, 11000, -1000);
  out.push("0", "TEXT", "8", "TEXT", "10", "3000", "20", "4000", "1", "Wohnzimmer");
  out.push("0", "TEXT", "8", "TEXT", "10", "8000", "20", "4000", "1", "Küche");
  out.push("0", "TEXT", "8", "TEXT", "10", "8000", "20", "3000", "1", "14,5 m²");
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

test("a DXF with walls as two faces: units guessed, rooms found and joined, the door gap a door, texts name the rooms", () => {
  const read = readDxf(dxf());
  assert.equal(read.unit, 0.001);
  assert.equal(read.layers.find((l) => l.name === "A-WALL")?.role, "wall");
  assert.equal(read.layers.find((l) => l.name === "BEMASSUNG")?.role, "ignore");
  const { building: b, stats } = buildPlan(read.plan);
  const f = b.floors[0];
  assert.deepEqual(f.rooms.map((r) => r.name).sort(), ["Küche", "Wohnzimmer"]);
  const areas = f.rooms.map((r) => Math.round(polygonArea(r.points) * 10) / 10).sort((a, c) => a - c);
  // joined on the inner wall's centre line at x = 6 m (inner faces from 0.15 to 9.85 / 7.85)
  assert.deepEqual(areas, [Math.round(3.85 * 7.7 * 10) / 10, Math.round(5.85 * 7.7 * 10) / 10]);
  assert.equal(stats.doors, 1);
  assert.equal(f.openings[0].width, 0.9);
  assert.equal(b.settings.wall_interior, 0.12);
});

test("layer roles are guessed from their names", () => {
  assert.equal(guessRole("Wände tragend"), "wall");
  assert.equal(guessRole("A-DOOR"), "door");
  assert.equal(guessRole("Fenster"), "window");
  assert.equal(guessRole("Räume"), "room");
  assert.equal(guessRole("Möbel"), "ignore");
});

test("a Valetudo map: its segments become rooms with their names", () => {
  // two segments of 5 cm pixels: 80 × 60 and 40 × 60 pixels, 3 pixels apart (a 15 cm wall)
  const run = (x0: number, w: number, h: number) => {
    const c: number[] = [];
    for (let y = 0; y < h; y++) c.push(x0, y, w);
    return c;
  };
  const map = {
    __class: "ValetudoMap",
    pixelSize: 5,
    layers: [
      { __class: "MapLayer", type: "floor", compressedPixels: [] },
      { __class: "MapLayer", type: "segment", compressedPixels: run(0, 80, 60), metaData: { segmentId: "1", name: "Wohnzimmer" } },
      { __class: "MapLayer", type: "segment", compressedPixels: run(83, 40, 60), metaData: { segmentId: "2", name: "" } },
    ],
  };
  assert.ok(isValetudo(map));
  const { building: b } = buildPlan(readValetudo(map));
  const f = b.floors[0];
  assert.equal(f.rooms.length, 2);
  assert.equal(f.rooms[0].name, "Wohnzimmer");
  assert.equal(f.rooms[1].name, "Raum 2");
  // 4 × 3 m and 2 × 3 m, joined across the 15 cm gap
  const areas = f.rooms.map((r) => polygonArea(r.points)).sort((a, c) => a - c);
  assert.ok(Math.abs(areas[0] - 2.075 * 3) < 0.05 && Math.abs(areas[1] - 4.075 * 3) < 0.05, String(areas));
});

test("a Floorplanner export: walls with their openings, areas, items", () => {
  const data = {
    floors: [
      {
        name: "EG",
        level: 0,
        height: 260,
        designs: [
          {
            walls: [
              { a: { x: 0, y: 0 }, b: { x: 500, y: 0 }, thickness: 24, height: 260, openings: [{ type: "window", t: 0.5, width: 120, z: 90, z_height: 130 }] },
              { a: { x: 500, y: 0 }, b: { x: 500, y: 400 }, thickness: 24, height: 260, openings: [{ type: "door", t: 0.5, width: 90, z: 0, z_height: 210 }] },
              { a: { x: 500, y: 400 }, b: { x: 0, y: 400 }, thickness: 24, height: 260 },
              { a: { x: 0, y: 400 }, b: { x: 0, y: 0 }, thickness: 24, height: 260 },
            ],
            areas: [{ name: "Büro", poly: [{ x: 12, y: 12 }, { x: 488, y: 12 }, { x: 488, y: 388 }, { x: 12, y: 388 }] }],
            items: [{ name: "Desk", x: 250, y: 100, width: 140, height: 70, z_height: 75, rotation: 90 }],
          },
        ],
      },
    ],
  };
  assert.ok(isFloorplanner(data));
  const { building: b, stats } = buildPlan(readFloorplanner(data));
  assert.equal(b.floors[0].rooms[0].name, "Büro");
  assert.equal(stats.windows, 1);
  assert.equal(stats.doors, 1);
  assert.equal(b.floors[0].furniture[0].type, "desk");
  assert.equal(b.floors[0].furniture[0].rotation, 90);
  assert.equal(b.floors[0].height, 2.6);
});

test("geometry: faces of a grid of lines, gaps closed, pixel outlines", () => {
  const segs = [
    { a: [0, 0] as [number, number], b: [4, 0] as [number, number] },
    { a: [4, 0] as [number, number], b: [4, 3] as [number, number] },
    { a: [4, 3] as [number, number], b: [0, 3] as [number, number] },
    { a: [0, 3] as [number, number], b: [0, 0] as [number, number] },
    { a: [2, 0] as [number, number], b: [2, 3] as [number, number] },
  ];
  assert.equal(faces(segs).length, 2);
  // a wall line with a 0.9 m gap
  const gap = bridgeGaps([
    { a: [0, 0], b: [2, 0] },
    { a: [2.9, 0], b: [5, 0] },
  ]);
  assert.equal(gap.length, 1);
  assert.ok(Math.abs(Math.hypot(gap[0].b[0] - gap[0].a[0], gap[0].b[1] - gap[0].a[1]) - 0.9) < 1e-9);
  // an L of pixels: 6 corners
  const cells = new Set<string>();
  for (let x = 0; x < 10; x++) for (let y = 0; y < 4; y++) cells.add(`${x},${y}`);
  for (let x = 0; x < 4; x++) for (let y = 4; y < 10; y++) cells.add(`${x},${y}`);
  const outline = traceCells(cells);
  assert.equal(outline.length, 6);
  assert.equal(polygonArea(outline), 64);
  assert.equal(cleanPolygon([[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]]).length, 4);
});

test("furniture names in several languages", () => {
  assert.equal(furnitureType("Doppelbett 180"), "bed");
  assert.equal(furnitureType("Canapé 3 places"), "sofa");
  assert.equal(furnitureType("Kühlschrank"), "fridge");
  assert.equal(furnitureType("Nachttisch"), "nightstand");
  assert.equal(furnitureType("Wall cabinet"), "kitchen_wall");
  assert.equal(furnitureType("Ceiling light", 0.1, 2.3), "lamp_ceiling");
  assert.equal(furnitureType("Kaminofen"), null);
});
