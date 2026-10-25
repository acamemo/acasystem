import assert from "node:assert/strict";
import { test } from "node:test";
import { readGltf, readMesh, readObj, readStl } from "./mesh.ts";
import { buildPlan } from "./builder.ts";
import { polygonArea } from "../model.ts";

// a box as 12 triangles (x0..x1, y0..y1, z0..z1), y up
function box(t: number[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void {
  const v = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const f = [
    [0, 2, 1, 0, 3, 2],
    [4, 5, 6, 4, 6, 7],
    [0, 1, 5, 0, 5, 4],
    [3, 7, 6, 3, 6, 2],
    [0, 4, 7, 0, 7, 3],
    [1, 2, 6, 1, 6, 5],
  ];
  for (const q of f) for (const i of q) t.push(...v[i]);
}

/** A two-storey house in metres: 10 × 8 m, 30 cm outer walls, an inner wall with a door, a front door, a window. */
function house(): number[] {
  const t: number[] = [];
  box(t, 0, 10, -0.2, 0, 0, 8); // ground slab
  // top wall with a window 2.4–3.6 m (sill 0.9, head 2.2)
  box(t, 0, 2.4, 0, 2.6, 0, 0.3);
  box(t, 3.6, 10, 0, 2.6, 0, 0.3);
  box(t, 2.4, 3.6, 0, 0.9, 0, 0.3);
  box(t, 2.4, 3.6, 2.2, 2.6, 0, 0.3);
  // bottom wall with the front door 7.5–8.5 m
  box(t, 0, 7.5, 0, 2.6, 7.7, 8);
  box(t, 8.5, 10, 0, 2.6, 7.7, 8);
  box(t, 7.5, 8.5, 2.1, 2.6, 7.7, 8);
  box(t, 0, 0.3, 0, 2.6, 0.3, 7.7);
  box(t, 9.7, 10, 0, 2.6, 0.3, 7.7);
  // the inner wall with its door 3.55–4.45 m
  box(t, 5.94, 6.06, 0, 2.6, 0.3, 3.55);
  box(t, 5.94, 6.06, 0, 2.6, 4.45, 7.7);
  box(t, 5.94, 6.06, 2.05, 2.6, 3.55, 4.45);
  // a wardrobe and a sofa in the living room
  box(t, 1, 2.2, 0, 2.0, 6.9, 7.5);
  box(t, 2, 4, 0, 0.8, 2, 2.9);
  // upper floor: slab, four walls, the roof slab
  box(t, 0, 10, 2.6, 2.8, 0, 8);
  box(t, 0, 10, 2.8, 5.4, 0, 0.3);
  box(t, 0, 10, 2.8, 5.4, 7.7, 8);
  box(t, 0, 0.3, 2.8, 5.4, 0.3, 7.7);
  box(t, 9.7, 10, 2.8, 5.4, 0.3, 7.7);
  box(t, 0, 10, 5.4, 5.6, 0, 8);
  return t;
}

test("a 3D model of a house: storeys found, rooms between the walls, doors and the window from the gaps", () => {
  const { plan, info } = readMesh(house(), { lang: "de" });
  assert.equal(info.up, "y");
  assert.equal(info.unit, 1);
  assert.equal(plan.floors.length, 2, JSON.stringify(info.levels));
  const { building: b, stats } = buildPlan(plan);
  const [eg, og] = b.floors;
  assert.equal(eg.rooms.length, 2, JSON.stringify(eg.rooms.map((r) => r.points)));
  const areas = eg.rooms.map((r) => Math.round(polygonArea(r.points) * 10) / 10).sort((a, c) => a - c);
  // inner faces 0.3…9.7 × 0.3…7.7, joined on the inner wall at x = 6
  assert.deepEqual(areas, [Math.round(3.7 * 7.4 * 10) / 10, Math.round(5.7 * 7.4 * 10) / 10]);
  assert.equal(eg.openings.filter((o) => o.type === "door").length, 2);
  assert.equal(eg.openings.filter((o) => o.type === "window").length, 1);
  assert.equal(og.rooms.length, 1);
  assert.ok(Math.abs(og.elevation - 2.8) < 0.06, String(og.elevation));
  assert.equal(stats.floors, 2);
});

test("a model in millimetres with Z up (an STL from a CAD program) reads the same", () => {
  const y = house();
  // to Z up in millimetres: (x, y, z) -> (x, -z, y) · 1000
  const z: number[] = [];
  for (let i = 0; i < y.length; i += 3) z.push(y[i] * 1000, -y[i + 2] * 1000, y[i + 1] * 1000);
  const { plan, info } = readMesh(z);
  assert.equal(info.up, "z");
  assert.equal(info.unit, 0.001);
  const { building: b } = buildPlan(plan);
  assert.equal(b.floors[0].rooms.length, 2);
});

test("OBJ, STL (binary and ASCII) and glTF give the same triangles", () => {
  const t: number[] = [];
  box(t, 0, 1, 0, 2, 0, 3);
  // OBJ: shared vertices, faces as quads
  const obj = "v 0 0 0\nv 1 0 0\nv 1 2 0\nv 0 2 0\nf 1 2 3 4\n";
  assert.equal(readObj(obj).length, 18);
  // binary STL
  const n = t.length / 9;
  const stl = new Uint8Array(84 + n * 50);
  const dv = new DataView(stl.buffer);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) dv.setFloat32(84 + i * 50 + 12 + k * 4, t[i * 9 + k], true);
  assert.deepEqual(readStl(stl), t);
  const ascii = `solid x\n${Array.from({ length: n }, (_, i) => `facet normal 0 0 0\nouter loop\n${[0, 1, 2].map((k) => `vertex ${t[i * 9 + k * 3]} ${t[i * 9 + k * 3 + 1]} ${t[i * 9 + k * 3 + 2]}`).join("\n")}\nendloop\nendfacet`).join("\n")}\nendsolid x`;
  assert.deepEqual(readStl(new TextEncoder().encode(ascii)), t);
  // glTF with an embedded buffer and a node that moves the mesh by 5 m
  const f32 = new Float32Array(t);
  const b64 = Buffer.from(f32.buffer).toString("base64");
  const gltf = {
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, translation: [5, 0, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: t.length / 3, type: "VEC3" }],
    bufferViews: [{ buffer: 0, byteLength: f32.byteLength }],
    buffers: [{ byteLength: f32.byteLength, uri: `data:application/octet-stream;base64,${b64}` }],
  };
  const got = readGltf(new TextEncoder().encode(JSON.stringify(gltf)));
  assert.equal(got.length, t.length);
  assert.equal(got[0], t[0] + 5);
});
