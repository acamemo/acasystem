// 3D models (Blender, SketchUp, Revit, Archicad … exported as glTF/GLB, OBJ or STL): only triangles, no idea what is a
// wall. The model is cut through horizontally on every storey – just under the door heads, so doors show as gaps and
// most furniture stays below – and the cut lines are read like a CAD drawing whose walls are drawn as two faces.
// A second cut at window height finds windows as gaps the doors do not explain.

import type { Vec2 } from "../model.ts";
import type { RawFloor, RawPlan, RawWall } from "./builder.ts";
import { bridgeGaps } from "./geom.ts";

/** Triangles as a flat list of x, y, z (9 numbers per triangle), in the model's own units and axes. */
export type Tris = Float32Array | number[];

// ------------------------------------------------------------------ readers

export function readObj(text: string): number[] {
  const v: number[][] = [];
  const out: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("v ")) {
      const [, x, y, z] = t.split(/\s+/);
      v.push([+x, +y, +z]);
    } else if (t.startsWith("f ")) {
      const idx = t
        .split(/\s+/)
        .slice(1)
        .map((s) => {
          const i = parseInt(s.split("/")[0], 10);
          return i < 0 ? v.length + i : i - 1;
        });
      for (let k = 1; k + 1 < idx.length; k++) for (const i of [idx[0], idx[k], idx[k + 1]]) out.push(...(v[i] ?? [0, 0, 0]));
    }
  }
  return out;
}

export function readStl(b: Uint8Array): number[] {
  const head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 512)));
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const binaryCount = b.length >= 84 ? dv.getUint32(80, true) : 0;
  // an ASCII STL starts with "solid" and has no matching binary size
  if (head.trimStart().startsWith("solid") && b.length !== 84 + binaryCount * 50) {
    const out: number[] = [];
    const text = new TextDecoder().decode(b);
    for (const m of text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) out.push(+m[1], +m[2], +m[3]);
    return out;
  }
  const out: number[] = [];
  for (let i = 0; i < binaryCount; i++) {
    const o = 84 + i * 50 + 12;
    for (let k = 0; k < 9; k++) out.push(dv.getFloat32(o + k * 4, true));
  }
  return out;
}

type M4 = number[];
const ident = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: M4, b: M4): M4 {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(n: { translation?: number[]; rotation?: number[]; scale?: number[] }): M4 {
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

interface Gltf {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  meshes?: { primitives: { attributes: { POSITION?: number }; indices?: number; mode?: number }[] }[];
  accessors?: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  buffers?: { uri?: string; byteLength: number }[];
}

/** glTF 2.0: a .glb, or a .gltf whose buffers are embedded (data: URIs). */
export function readGltf(bytes: Uint8Array): number[] {
  let json: Gltf;
  let bin: Uint8Array | null = null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length > 12 && dv.getUint32(0, true) === 0x46546c67) {
    // GLB: a JSON chunk, then a binary chunk
    let p = 12;
    json = {};
    while (p + 8 <= bytes.length) {
      const len = dv.getUint32(p, true);
      const type = dv.getUint32(p + 4, true);
      const chunk = bytes.subarray(p + 8, p + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
      else if (type === 0x004e4942) bin = chunk;
      p += 8 + len;
    }
  } else json = JSON.parse(new TextDecoder().decode(bytes));
  const buffers = (json.buffers ?? []).map((b, i) => {
    if (i === 0 && bin) return bin;
    const m = b.uri?.match(/^data:[^;]*;base64,(.*)$/);
    if (!m) throw new Error("gltf_external");
    const raw = atob(m[1]);
    const out = new Uint8Array(raw.length);
    for (let k = 0; k < raw.length; k++) out[k] = raw.charCodeAt(k);
    return out;
  });
  const read = (ai: number): number[] => {
    const a = json.accessors![ai];
    const bv = json.bufferViews![a.bufferView ?? 0];
    const buf = buffers[bv.buffer];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] ?? 1;
    const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType] ?? 4;
    const stride = bv.byteStride || comps * size;
    const base = buf.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const view = new DataView(buf.buffer);
    const out: number[] = [];
    for (let i = 0; i < a.count; i++)
      for (let c = 0; c < comps; c++) {
        const o = base + i * stride + c * size;
        out.push(
          a.componentType === 5126 ? view.getFloat32(o, true) : a.componentType === 5125 ? view.getUint32(o, true) : a.componentType === 5123 ? view.getUint16(o, true) : a.componentType === 5121 ? view.getUint8(o) : a.componentType === 5122 ? view.getInt16(o, true) : view.getInt8(o),
        );
      }
    return out;
  };
  const out: number[] = [];
  const walk = (ni: number, parent: M4) => {
    const n = json.nodes![ni];
    const m = mul(parent, n.matrix?.length === 16 ? n.matrix : trs(n));
    if (n.mesh !== undefined)
      for (const prim of json.meshes![n.mesh].primitives) {
        if ((prim.mode ?? 4) !== 4 || prim.attributes.POSITION === undefined) continue;
        const pos = read(prim.attributes.POSITION);
        const idx = prim.indices !== undefined ? read(prim.indices) : [...Array(pos.length / 3).keys()];
        for (const i of idx) {
          const x = pos[i * 3];
          const y = pos[i * 3 + 1];
          const z = pos[i * 3 + 2];
          out.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        }
      }
    for (const c of n.children ?? []) walk(c, m);
  };
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? (json.nodes ?? []).map((_, i) => i);
  for (const r of roots) walk(r, ident());
  return out;
}

// ------------------------------------------------------------------ from triangles to a plan

export interface MeshOptions {
  /** Which model axis points up ("auto": the shortest extent of the model). */
  up?: "auto" | "y" | "z";
  /** Metres per model unit (null: guessed from the size). */
  unit?: number | null;
  /** Floor levels in metres above the lowest one (null: found from the large flat areas). */
  levels?: number[] | null;
  lang?: string;
}

export interface MeshInfo {
  up: "y" | "z";
  unit: number;
  levels: number[];
  size: [number, number, number];
}

/** The model in metres, y up, x/z in the plan; the lowest point at y = 0. */
function normalise(t: Tris, opt: MeshOptions): { pts: Float64Array; up: "y" | "z"; unit: number; size: [number, number, number] } {
  const n = t.length / 3;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) {
      const v = t[i * 3 + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  const ext = max.map((v, k) => v - min[k]);
  // a house is wider than tall: the shortest extent is up (Blender exports Y up as glTF, many tools Z up as STL)
  const up = opt.up && opt.up !== "auto" ? opt.up : ext[2] < ext[1] && ext[2] < ext[0] ? "z" : "y";
  const span = Math.max(ext[0], up === "y" ? ext[2] : ext[1]);
  const unit = opt.unit ?? (span > 2500 ? 0.001 : span > 150 ? 0.01 : span > 60 ? 0.0254 : 1);
  const pts = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = (t[i * 3] - min[0]) * unit;
    const y = (t[i * 3 + 1] - min[1]) * unit;
    const z = (t[i * 3 + 2] - min[2]) * unit;
    // Z up: the model's y runs up the plan, so it becomes -z (not mirrored)
    if (up === "y") pts.set([x, y, z], i * 3);
    else pts.set([x, z, -y], i * 3);
  }
  const size: [number, number, number] = up === "y" ? [ext[0] * unit, ext[1] * unit, ext[2] * unit] : [ext[0] * unit, ext[2] * unit, ext[1] * unit];
  return { pts, up, unit, size };
}

/** Storey levels: heights where large flat areas face up (floors), at least 1.8 m apart. */
function findLevels(pts: Float64Array): number[] {
  const bins = new Map<number, number>();
  for (let i = 0; i < pts.length; i += 9) {
    const ax = pts[i + 3] - pts[i];
    const ay = pts[i + 4] - pts[i + 1];
    const az = pts[i + 5] - pts[i + 2];
    const bx = pts[i + 6] - pts[i];
    const by = pts[i + 7] - pts[i + 1];
    const bz = pts[i + 8] - pts[i + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz);
    // floors face up (the undersides of slabs and ceilings face down)
    if (len < 1e-9 || ny / len < 0.95) continue;
    const y = (pts[i + 1] + pts[i + 4] + pts[i + 7]) / 3;
    const k = Math.round(y / 0.05);
    bins.set(k, (bins.get(k) ?? 0) + len / 2);
  }
  const peaks = [...bins.entries()].filter(([, a]) => a >= 6).sort((a, b) => a[0] - b[0]);
  const levels: number[] = [];
  for (const [k] of peaks) {
    const y = k * 0.05;
    if (!levels.length || y - levels[levels.length - 1] >= 1.8) levels.push(Math.round(y * 100) / 100);
  }
  return levels.length ? levels : [0];
}

/** The lines where the model's steep faces cross a level. */
function slice(pts: Float64Array, h: number): RawWall[] {
  const out: RawWall[] = [];
  for (let i = 0; i < pts.length; i += 9) {
    const p = [0, 1, 2].map((k) => [pts[i + k * 3], pts[i + k * 3 + 1], pts[i + k * 3 + 2]]);
    const cut: Vec2[] = [];
    for (let k = 0; k < 3; k++) {
      const a = p[k];
      const b = p[(k + 1) % 3];
      if ((a[1] - h) * (b[1] - h) < 0) {
        const t = (h - a[1]) / (b[1] - a[1]);
        cut.push([a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    if (cut.length === 2 && Math.hypot(cut[1][0] - cut[0][0], cut[1][1] - cut[0][1]) > 0.005) out.push({ a: cut[0], b: cut[1] });
  }
  return mergeCollinear(out);
}

/** Pieces of one straight line joined (a wall's face is cut into many small pieces by its triangles). */
function mergeCollinear(input: RawWall[]): RawWall[] {
  const segs = input.map((s) => ({ a: s.a, b: s.b }));
  const key = (p: Vec2) => `${Math.round(p[0] * 200)},${Math.round(p[1] * 200)}`;
  const by = new Map<string, Set<number>>();
  const add = (k: string, i: number) => (by.get(k) ?? by.set(k, new Set()).get(k)!).add(i);
  segs.forEach((s, i) => {
    add(key(s.a), i);
    add(key(s.b), i);
  });
  const alive = segs.map(() => true);
  const dir = (s: RawWall): Vec2 => {
    const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1;
    return [(s.b[0] - s.a[0]) / l, (s.b[1] - s.a[1]) / l];
  };
  // a work list of points: where exactly two pieces meet in line, they become one, and its far ends are looked at again
  const queue = [...by.keys()];
  while (queue.length) {
    const k = queue.pop()!;
    const set = by.get(k);
    if (!set || set.size !== 2) continue;
    const [i, j] = [...set];
    const s = segs[i];
    const t = segs[j];
    const ds = dir(s);
    const dt = dir(t);
    if (Math.abs(ds[0] * dt[1] - ds[1] * dt[0]) > 0.02) continue;
    const far = (x: RawWall) => (key(x.a) === k ? x.b : x.a);
    const fa = far(s);
    const fb = far(t);
    if (key(fa) === key(fb)) continue;
    segs[i] = { a: fa, b: fb };
    alive[j] = false;
    by.delete(k);
    by.get(key(fb))?.delete(j);
    add(key(fb), i);
    queue.push(key(fa), key(fb));
  }
  return segs.filter((_, i) => alive[i]);
}

/**
 * Small separate parts of a cut left out: table legs, vases, a chair's frame (less than `minLen` of lines in all).
 * Walls are long connected runs of lines.
 */
function dropSmallParts(segs: RawWall[], minLen = 1.5): RawWall[] {
  const key = (p: Vec2) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = k;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  for (const s of segs)
    for (const p of [s.a, s.b])
      if (!parent.has(key(p))) parent.set(key(p), key(p));
  for (const s of segs) {
    const a = find(key(s.a));
    const b = find(key(s.b));
    if (a !== b) parent.set(a, b);
  }
  const total = new Map<string, number>();
  for (const s of segs) {
    const r = find(key(s.a));
    total.set(r, (total.get(r) ?? 0) + Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]));
  }
  return segs.filter((s) => (total.get(find(key(s.a))) ?? 0) >= minLen);
}

/** Whether lines of a cut lie near a point (a wall below a window's gap; nothing below a door's). */
function linesNear(segs: RawWall[]): (p: Vec2, r: number) => boolean {
  const grid = new Map<string, RawWall[]>();
  for (const s of segs) {
    const x0 = Math.floor(Math.min(s.a[0], s.b[0]));
    const x1 = Math.floor(Math.max(s.a[0], s.b[0]));
    const z0 = Math.floor(Math.min(s.a[1], s.b[1]));
    const z1 = Math.floor(Math.max(s.a[1], s.b[1]));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) (grid.get(`${x},${z}`) ?? grid.set(`${x},${z}`, []).get(`${x},${z}`)!).push(s);
  }
  return (p, r) => {
    for (const s of grid.get(`${Math.floor(p[0])},${Math.floor(p[1])}`) ?? []) {
      const dx = s.b[0] - s.a[0];
      const dz = s.b[1] - s.a[1];
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / l2));
      if (Math.hypot(s.a[0] + dx * t - p[0], s.a[1] + dz * t - p[1]) <= r) return true;
    }
    return false;
  };
}

export function readMesh(t: Tris, opt: MeshOptions = {}): { plan: RawPlan; info: MeshInfo } {
  if (t.length < 9) throw new Error("nothing_found");
  const { pts, up, unit, size } = normalise(t, opt);
  const levels = opt.levels?.length ? [...opt.levels].sort((a, b) => a - b) : findLevels(pts);
  const de = (opt.lang ?? "de").startsWith("de");
  const floors: RawFloor[] = levels.map((y, i) => {
    const height = i + 1 < levels.length ? levels[i + 1] - y : Math.min(3, Math.max(2.3, size[1] - y - 0.2));
    // just under the door heads (doors are gaps there), above most furniture; and at window height
    const high = y + Math.min(1.95, height * 0.78);
    const walls = dropSmallParts(slice(pts, high));
    const mid = (g: { a: Vec2; b: Vec2 }): Vec2 => [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2];
    const near = (p: Vec2, q: Vec2) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6;
    // a gap in the walls under the door heads: a door when the wall is open down to the floor there too, else
    // (a wall under it) a window reaching up high
    const lowLines = linesNear(slice(pts, y + 0.3));
    const highGaps = bridgeGaps(walls.map((w) => ({ a: w.a, b: w.b })), 0.5, 3.2);
    const doors = highGaps.filter((g) => !lowLines(mid(g), 0.12));
    const windows = [
      ...highGaps.filter((g) => lowLines(mid(g), 0.12)),
      ...bridgeGaps(dropSmallParts(slice(pts, y + Math.min(1.35, height * 0.55))).map((w) => ({ a: w.a, b: w.b })), 0.4, 3.2),
    ].filter((g, i, all) => !doors.some((d) => near(mid(d), mid(g))) && all.findIndex((x) => near(mid(x), mid(g))) === i);
    return {
      name: levels.length === 1 ? (de ? "Erdgeschoss" : "Ground floor") : de ? `Etage ${i + 1}` : `Floor ${i + 1}`,
      elevation: Math.round(y * 100) / 100,
      height: Math.round(height * 100) / 100,
      rooms: [],
      walls,
      openings: [
        ...doors.map((g) => ({ kind: "door" as const, at: mid(g), width: Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), height: 2.01, sill: 0 })),
        ...windows.map((g) => ({ kind: "window" as const, at: mid(g), width: Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), height: 1.25, sill: 0.9 })),
      ],
      furniture: [],
    };
  });
  // a level with no walls cut (a flat roof's top) is no storey
  const used = floors.filter((f) => f.walls.length >= 4);
  if (!used.length) throw new Error("nothing_found");
  used.forEach((f, i) => (f.name = used.length === 1 ? (de ? "Erdgeschoss" : "Ground floor") : de ? `Etage ${i + 1}` : `Floor ${i + 1}`));
  return { plan: { source: "3D", floors: used, roomsAtInnerFaces: true, wallFaces: true, align: true }, info: { up, unit, levels: used.map((f) => f.elevation), size } };
}
