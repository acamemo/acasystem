// Geometry for the importers: cleaning polygons, finding rooms in a drawing of lines (the faces of a planar graph),
// closing door gaps in wall lines, and outlines of filled pixel areas (robot vacuum maps). Plan units are metres.

import type { Vec2 } from "../model.ts";
import { signedArea } from "../model.ts";

export interface Seg {
  a: Vec2;
  b: Vec2;
  /** Added to close a gap in a wall line (a door). */
  gap?: boolean;
}

const dist = (p: Vec2, q: Vec2) => Math.hypot(q[0] - p[0], q[1] - p[1]);

/** Points closer than `tol` merged, points on a straight line between their neighbours taken out, counter-clockwise. */
export function cleanPolygon(points: readonly Vec2[], tol = 0.01, angleTol = 0.01): Vec2[] {
  let pts: Vec2[] = [];
  for (const p of points) if (!pts.length || dist(pts[pts.length - 1], p) > tol) pts.push([p[0], p[1]]);
  while (pts.length > 1 && dist(pts[0], pts[pts.length - 1]) <= tol) pts.pop();
  // straight runs: a point whose neighbours lie on one line with it goes
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[(i + pts.length - 1) % pts.length];
      const q = pts[i];
      const r = pts[(i + 1) % pts.length];
      const l1 = dist(p, q);
      const l2 = dist(q, r);
      if (l1 < 1e-9 || l2 < 1e-9) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
      const cross = ((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0])) / (l1 * l2);
      const dot = ((q[0] - p[0]) * (r[0] - q[0]) + (q[1] - p[1]) * (r[1] - q[1])) / (l1 * l2);
      if (Math.abs(cross) < angleTol && dot > 0) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  if (pts.length >= 3 && signedArea(pts) < 0) pts = pts.reverse();
  return pts;
}

/** Edges within `tolDeg` of the x or z axis made exactly straight (a drawing a few degrees off is mostly meant square). */
export function squareUp(points: readonly Vec2[], tolDeg = 4): Vec2[] {
  const pts = points.map((p) => [p[0], p[1]] as Vec2);
  const tol = Math.tan((tolDeg * Math.PI) / 180);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    if (Math.abs(dx) > 1e-9 && Math.abs(dz / dx) < tol) {
      const z = (p[1] + q[1]) / 2;
      p[1] = z;
      q[1] = z;
    } else if (Math.abs(dz) > 1e-9 && Math.abs(dx / dz) < tol) {
      const x = (p[0] + q[0]) / 2;
      p[0] = x;
      q[0] = x;
    }
  }
  return pts;
}

/** Douglas–Peucker simplification of a closed outline. */
export function simplify(points: readonly Vec2[], tol: number): Vec2[] {
  if (points.length < 4) return points.map((p) => [p[0], p[1]] as Vec2);
  // split the ring at its two farthest points, simplify both halves
  let a = 0;
  let b = 0;
  let best = -1;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const d = dist(points[i], points[j]);
      if (d > best) {
        best = d;
        a = i;
        b = j;
      }
    }
  const part = (from: number, to: number) => {
    const out: Vec2[] = [];
    for (let i = from; ; i = (i + 1) % points.length) {
      out.push(points[i]);
      if (i === to) break;
    }
    return out;
  };
  const dp = (pts: Vec2[]): Vec2[] => {
    if (pts.length < 3) return pts;
    const [p, q] = [pts[0], pts[pts.length - 1]];
    const len = dist(p, q) || 1e-9;
    let far = 0;
    let at = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((q[0] - p[0]) * (p[1] - pts[i][1]) - (p[0] - pts[i][0]) * (q[1] - p[1])) / len;
      if (d > far) {
        far = d;
        at = i;
      }
    }
    if (far <= tol) return [p, q];
    const left = dp(pts.slice(0, at + 1));
    const right = dp(pts.slice(at));
    return [...left.slice(0, -1), ...right];
  };
  const one = dp(part(a, b));
  const two = dp(part(b, a));
  return [...one.slice(0, -1), ...two.slice(0, -1)].map((p) => [p[0], p[1]] as Vec2);
}

/**
 * Gaps in wall lines closed: two line ends on one straight line, facing each other `minGap` … `maxGap` apart with
 * nothing in between (a door opening drawn as a gap, also where short jamb lines close the wall's ends), get a
 * bridging segment marked as a gap. A line end is where a line stops without another one going on straight.
 */
export function bridgeGaps(segs: readonly Seg[], minGap = 0.5, maxGap = 1.3, tol = 0.04): Seg[] {
  const key = (p: Vec2) => `${Math.round(p[0] / 0.01)},${Math.round(p[1] / 0.01)}`;
  // every segment end with the direction pointing out of its segment
  const at = new Map<string, Vec2[]>();
  const ends: { p: Vec2; dir: Vec2; used: boolean }[] = [];
  for (const s of segs) {
    const len = dist(s.a, s.b);
    if (len < 1e-6) continue;
    const d: Vec2 = [(s.b[0] - s.a[0]) / len, (s.b[1] - s.a[1]) / len];
    for (const [p, out, into] of [
      [s.a, [-d[0], -d[1]], d],
      [s.b, d, [-d[0], -d[1]]],
    ] as [Vec2, Vec2, Vec2][]) {
      (at.get(key(p)) ?? at.set(key(p), []).get(key(p))!).push(into);
      ends.push({ p, dir: out, used: false });
    }
  }
  // a line goes on straight from this end: no gap starts here
  const goesOn = (e: { p: Vec2; dir: Vec2 }) => (at.get(key(e.p)) ?? []).some((v) => v[0] * e.dir[0] + v[1] * e.dir[1] > 0.995);
  const free = ends.filter((e) => !goesOn(e));
  const sgrid = new Map<string, Seg[]>();
  for (const s of segs) {
    const x0 = Math.floor(Math.min(s.a[0], s.b[0]));
    const x1 = Math.floor(Math.max(s.a[0], s.b[0]));
    const z0 = Math.floor(Math.min(s.a[1], s.b[1]));
    const z1 = Math.floor(Math.max(s.a[1], s.b[1]));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) (sgrid.get(`${x},${z}`) ?? sgrid.set(`${x},${z}`, []).get(`${x},${z}`)!).push(s);
  }
  const nearSegs = (a: Vec2, b: Vec2) => {
    const out = new Set<Seg>();
    for (let x = Math.floor(Math.min(a[0], b[0])); x <= Math.floor(Math.max(a[0], b[0])); x++)
      for (let z = Math.floor(Math.min(a[1], b[1])); z <= Math.floor(Math.max(a[1], b[1])); z++) for (const s of sgrid.get(`${x},${z}`) ?? []) out.add(s);
    return out;
  };
  const crosses = (a: Vec2, b: Vec2) =>
    [...nearSegs(a, b)].some((s) => {
      const r: Vec2 = [b[0] - a[0], b[1] - a[1]];
      const q: Vec2 = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
      const den = r[0] * q[1] - r[1] * q[0];
      if (Math.abs(den) < 1e-9) return false;
      const w: Vec2 = [s.a[0] - a[0], s.a[1] - a[1]];
      const u = (w[0] * q[1] - w[1] * q[0]) / den;
      const v = (w[0] * r[1] - w[1] * r[0]) / den;
      return u > 0.02 && u < 0.98 && v > 0.02 && v < 0.98;
    });
  const out: Seg[] = [];
  const seen = new Set<string>();
  // free ends by 2 m cells: a partner lies at most maxGap away
  const cell = (p: Vec2) => `${Math.floor(p[0] / 2)},${Math.floor(p[1] / 2)}`;
  const byCell = new Map<string, (typeof free)[number][]>();
  for (const f of free) (byCell.get(cell(f.p)) ?? byCell.set(cell(f.p), []).get(cell(f.p))!).push(f);
  const around = (p: Vec2) => {
    const [cx, cz] = cell(p).split(",").map(Number);
    const out: (typeof free)[number][] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push(...(byCell.get(`${cx + dx},${cz + dz}`) ?? []));
    return out;
  };
  for (const e of free) {
    if (e.used) continue;
    let best: (typeof free)[number] | null = null;
    let bestD = Infinity;
    for (const f of around(e.p)) {
      if (f === e || f.used) continue;
      // facing each other on one line
      if (e.dir[0] * f.dir[0] + e.dir[1] * f.dir[1] > -0.995) continue;
      const v: Vec2 = [f.p[0] - e.p[0], f.p[1] - e.p[1]];
      const along = v[0] * e.dir[0] + v[1] * e.dir[1];
      const off = Math.abs(v[0] * e.dir[1] - v[1] * e.dir[0]);
      if (along < minGap || along > maxGap || off > tol || along >= bestD) continue;
      best = f;
      bestD = along;
    }
    if (!best || crosses(e.p, best.p)) continue;
    const k = [key(e.p), key(best.p)].sort().join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    e.used = true;
    best.used = true;
    out.push({ a: e.p, b: best.p, gap: true });
  }
  return out;
}

/** Segments split where they cross or touch each other, end points within `tol` merged. */
export function splitSegments(segs: readonly Seg[], tol = 0.01): Seg[] {
  const cuts = segs.map(() => [0, 1]);
  // a grid of 1 m cells: only segments sharing a cell can touch (large drawings and model sections hold thousands)
  const CELL = 1;
  const grid = new Map<string, number[]>();
  const cellsOf = (s: Seg) => {
    const out: string[] = [];
    const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - tol) / CELL);
    const x1 = Math.floor((Math.max(s.a[0], s.b[0]) + tol) / CELL);
    const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - tol) / CELL);
    const z1 = Math.floor((Math.max(s.a[1], s.b[1]) + tol) / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) out.push(`${x},${z}`);
    return out;
  };
  segs.forEach((s, i) => {
    for (const c of cellsOf(s)) (grid.get(c) ?? grid.set(c, []).get(c)!).push(i);
  });
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const r: Vec2 = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
    const rl = Math.hypot(r[0], r[1]);
    if (rl < 1e-9) continue;
    const near = new Set<number>();
    for (const c of cellsOf(s)) for (const j of grid.get(c) ?? []) near.add(j);
    for (const j of near) {
      if (i === j) continue;
      const t = segs[j];
      const q: Vec2 = [t.b[0] - t.a[0], t.b[1] - t.a[1]];
      const den = r[0] * q[1] - r[1] * q[0];
      const w: Vec2 = [t.a[0] - s.a[0], t.a[1] - s.a[1]];
      if (Math.abs(den) > 1e-9) {
        const u = (w[0] * q[1] - w[1] * q[0]) / den;
        const v = (w[0] * r[1] - w[1] * r[0]) / den;
        const tu = tol / rl;
        const tv = tol / (Math.hypot(q[0], q[1]) || 1);
        if (u > tu && u < 1 - tu && v >= -tv && v <= 1 + tv) cuts[i].push(u);
      }
      // an end of the other segment on this one (T-junctions, also collinear overlaps)
      for (const p of [t.a, t.b]) {
        const u = ((p[0] - s.a[0]) * r[0] + (p[1] - s.a[1]) * r[1]) / (rl * rl);
        const off = Math.abs((p[0] - s.a[0]) * r[1] - (p[1] - s.a[1]) * r[0]) / rl;
        if (off <= tol && u > tol / rl && u < 1 - tol / rl) cuts[i].push(u);
      }
    }
  }
  const out: Seg[] = [];
  segs.forEach((s, i) => {
    const us = [...new Set(cuts[i].map((u) => Math.round(u * 1e6) / 1e6))].sort((a, b) => a - b);
    for (let k = 0; k + 1 < us.length; k++) {
      const p: Vec2 = [s.a[0] + (s.b[0] - s.a[0]) * us[k], s.a[1] + (s.b[1] - s.a[1]) * us[k]];
      const q: Vec2 = [s.a[0] + (s.b[0] - s.a[0]) * us[k + 1], s.a[1] + (s.b[1] - s.a[1]) * us[k + 1]];
      if (dist(p, q) > tol) out.push({ a: p, b: q, gap: s.gap });
    }
  });
  return out;
}

/**
 * The closed areas a drawing of lines encloses (the bounded faces of the planar graph), counter-clockwise, with
 * their area. Lines are split at crossings first; loose ends are ignored.
 */
export function faces(input: readonly Seg[], tol = 0.01): { points: Vec2[]; area: number }[] {
  const segs = splitSegments(input, tol);
  // vertices merged on a grid of the tolerance
  const verts: Vec2[] = [];
  const index = new Map<string, number>();
  const vid = (p: Vec2) => {
    const k = `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)}`;
    let i = index.get(k);
    if (i === undefined) {
      // a neighbouring cell may hold the same point
      for (const [dx, dz] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        const j = index.get(`${Math.round(p[0] / tol) + dx},${Math.round(p[1] / tol) + dz}`);
        if (j !== undefined && dist(verts[j], p) <= tol) return j;
      }
      i = verts.length;
      verts.push([p[0], p[1]]);
      index.set(k, i);
    }
    return i;
  };
  const adj = new Map<number, Set<number>>();
  for (const s of segs) {
    const a = vid(s.a);
    const b = vid(s.b);
    if (a === b) continue;
    (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
    (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
  }
  // loose ends cannot bound a face: prune them repeatedly
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const [v, n] of adj)
      if (n.size < 2) {
        for (const w of n) adj.get(w)?.delete(v);
        adj.delete(v);
        pruned = true;
      }
  }
  // neighbours sorted by angle around each vertex
  const around = new Map<number, number[]>();
  for (const [v, n] of adj) around.set(v, [...n].sort((p, q) => Math.atan2(verts[p][1] - verts[v][1], verts[p][0] - verts[v][0]) - Math.atan2(verts[q][1] - verts[v][1], verts[q][0] - verts[v][0])));
  const seen = new Set<string>();
  const out: { points: Vec2[]; area: number }[] = [];
  for (const [u, list] of around)
    for (const v of list) {
      if (seen.has(`${u}>${v}`)) continue;
      // walk: always take the next edge clockwise from the one we came in on (the face on our left)
      const ring: number[] = [];
      let a = u;
      let b = v;
      let guard = 0;
      while (!seen.has(`${a}>${b}`) && guard++ < 100000) {
        seen.add(`${a}>${b}`);
        ring.push(a);
        const n = around.get(b)!;
        const back = n.indexOf(a);
        const next = n[(back - 1 + n.length) % n.length];
        a = b;
        b = next;
      }
      if (ring.length < 3 || a !== u) continue;
      const pts = ring.map((i) => verts[i]);
      const area = signedArea(pts);
      // the walk keeps the face on its left: bounded faces come out counter-clockwise (positive)
      if (area > 1e-6) out.push({ points: pts, area });
    }
  return out;
}

/** The outline of a filled area of grid cells (a robot vacuum map's segment), in cell units, counter-clockwise. */
export function traceCells(cells: ReadonlySet<string>): Vec2[] {
  const has = (x: number, y: number) => cells.has(`${x},${y}`);
  const key = (p: Vec2) => `${p[0]},${p[1]}`;
  // the borders of every filled cell next to an empty one, directed so the filled side lies to the right (y down)
  const edges = new Map<string, Vec2[]>();
  const add = (a: Vec2, b: Vec2) => (edges.get(key(a)) ?? edges.set(key(a), []).get(key(a))!).push(b);
  for (const c of cells) {
    const [x, y] = c.split(",").map(Number);
    if (!has(x, y - 1)) add([x, y], [x + 1, y]);
    if (!has(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
    if (!has(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
    if (!has(x - 1, y)) add([x, y + 1], [x, y]);
  }
  const used = new Set<string>();
  let best: Vec2[] = [];
  let bestArea = 0;
  for (const [from, tos] of edges)
    for (const first of tos) {
      if (used.has(`${from}>${key(first)}`)) continue;
      let a = from.split(",").map(Number) as Vec2;
      let b = first;
      const loop: Vec2[] = [];
      for (let guard = 0; guard < 4e6; guard++) {
        const k = `${key(a)}>${key(b)}`;
        if (used.has(k)) break;
        used.add(k);
        loop.push(a);
        // where two areas touch at a corner, turn right first: each area keeps its own outline
        const d: Vec2 = [b[0] - a[0], b[1] - a[1]];
        let pick: Vec2 | null = null;
        let score = -1;
        for (const c of edges.get(key(b)) ?? []) {
          if (used.has(`${key(b)}>${key(c)}`)) continue;
          const e: Vec2 = [c[0] - b[0], c[1] - b[1]];
          const cross = d[0] * e[1] - d[1] * e[0];
          const s = cross > 0 ? 2 : cross === 0 ? 1 : 0;
          if (s > score) {
            score = s;
            pick = c;
          }
        }
        if (!pick) break;
        a = b;
        b = pick;
      }
      const area = Math.abs(signedArea(loop));
      if (area > bestArea) {
        bestArea = area;
        best = loop;
      }
    }
  return cleanPolygon(best, 1e-6, 1e-9);
}
