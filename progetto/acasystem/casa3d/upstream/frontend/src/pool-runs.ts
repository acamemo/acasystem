// Pool Pro: the pipes of a pool as runs – where their nodes sit (ports, devices, T-pieces), turning an older
// level pipe into one with a height per point, splitting a pipe for a T-piece, and drawing them on a wall.
// Pure functions shared by the 3D view and the editor's wall view.

import { pointInPolygon, POOL_DEVICES, POOL_VALVE_Y, poolFloorY, poolWaterY, type Building, type Floor, type OutdoorArea, type PoolJoint, type PoolPipe, type Vec2 } from "./model.ts";
import { mountBase } from "./packs.ts";
import { nearestOnPath, pathLength, pipePath, pointAlong, PIPE_HEIGHT, type NodeAt, type P3 } from "./geometry/runs.ts";
import { toWall, type WallFrame } from "./geometry/wall-frame.ts";
import { jointPortAt, portAt, splitNode } from "./pool-ports.ts";

/** Where the pipes of a pool end: its ports, the pool devices (on any floor, hung ones higher) and its T-pieces. */
export function poolNodeAt(b: Building, floor: Floor, area: OutdoorArea): NodeAt {
  const links = area.pool ?? {};
  const water = poolWaterY(floor, area);
  return (node) => {
    const { kind, id, port } = splitNode(node);
    if (kind === "port") {
      const q = links.ports?.find((x) => x.id === id);
      if (!q) return null;
      // skimmer at the water line, the drain on the pool's floor, inlets as deep as set (30 cm), the waste drain in the floor
      const y = q.kind === "skimmer" ? water - (q.depth ?? 0) : q.kind === "drain" ? poolFloorY(floor, area) + 0.03 : q.kind === "inlet" ? water - (q.depth ?? 0.3) : 0.02;
      return { x: q.x, z: q.z, y };
    }
    if (kind === "joint") {
      const j = links.joints?.find((x) => x.id === id);
      return j ? jointPortAt(j, port) : null;
    }
    if (kind !== "dev") return null;
    for (const fl of b.floors) {
      const f = fl.furniture.find((m) => m.id === id);
      if (!f || !(POOL_DEVICES as readonly string[]).includes(f.type)) continue;
      const at = port ? portAt(f, port) : null;
      // a device on another floor (pump and filter in the basement): its height in the pool floor's coordinates
      const shift = fl.elevation - floor.elevation;
      if (at) return { ...at, y: at.y + mountBase(fl, f) + shift };
      const y = f.type === "pool_filter" ? f.h * 0.88 : f.type === "pool_dosing" ? 0.95 : f.type === "pool_valve" ? POOL_VALVE_Y : f.type === "pool_pump" ? 0.2 : 0.3;
      return { x: f.x, z: f.z, y: y + mountBase(fl, f) + shift };
    }
    return null;
  };
}

/**
 * A pipe at the bottom drain leaves under the pool's floor, not up through the water: from the drain down a little,
 * under the floor to the pool's edge, and only there up to the pipe's own height. Other paths stay as they are.
 */
export function underBasin(path: P3[], p: Pick<PoolPipe, "from" | "to">, area: OutdoorArea, floor: Floor): P3[] {
  const portKind = (node: string) => {
    const { kind, id } = splitNode(node);
    return kind === "port" ? area.pool?.ports?.find((q) => q.id === id)?.kind : undefined;
  };
  const drainAt = (node: string) => portKind(node) === "drain";
  const wallPort = (node: string) => portKind(node) === "inlet" || portKind(node) === "skimmer";
  // an inlet or the skimmer sits in the wall: its pipe leaves straight out through the wall at its height, and only
  // outside the basin turns to its own height (not up through the water)
  const through = (pts: P3[]): P3[] => {
    if (pts.length < 2) return pts;
    const d = pts[0];
    const n = poolWallNormal(area, [d[0], d[2]]);
    if (!n) return pts;
    const out: P3 = [d[0] + n[0] * 0.35, d[1], d[2] + n[1] * 0.35];
    // drop the riser at the port itself (same place in the plan), keep the rest
    let k = 1;
    while (k < pts.length && Math.hypot(pts[k][0] - d[0], pts[k][2] - d[2]) < 0.01) k++;
    // points drawn along the wall itself (or inside the basin) move out with it, onto a line 35 cm behind the wall,
    // up to the first one already that far out: no zigzag back to the wall
    const rest = pts.slice(k).map((q) => [...q] as P3);
    for (let i = 0; i < rest.length - 1; i++) {
      const behind = (rest[i][0] - d[0]) * n[0] + (rest[i][2] - d[2]) * n[1];
      if (behind >= 0.35 - 1e-6) break;
      rest[i][0] += n[0] * (0.35 - behind);
      rest[i][2] += n[1] * (0.35 - behind);
    }
    const next = rest[0] ?? pts[pts.length - 1];
    return [d, out, [out[0], next[1], out[2]], ...rest];
  };
  const fix = (pts: P3[]): P3[] => {
    if (pts.length < 2) return pts;
    const d = pts[0];
    if (!pointInPolygon([d[0], d[2]], area.points)) return pts;
    const low = poolFloorY(floor, area) - 0.15;
    // the first point beyond the drain in the plan, and where the way there leaves the pool
    const k = pts.findIndex((q, i) => i > 0 && Math.hypot(q[0] - d[0], q[2] - d[2]) > 0.01);
    if (k < 0) return pts;
    const q = pts[k];
    let exit: Vec2 = [q[0], q[2]];
    for (let i = 0; i < area.points.length; i++) {
      const a = area.points[i];
      const b = area.points[(i + 1) % area.points.length];
      const hit = segHit([d[0], d[2]], [q[0], q[2]], a, b);
      if (hit) exit = hit;
    }
    const out = (Math.hypot(exit[0] - d[0], exit[1] - d[2]) > 1e-6 ? [exit[0] + (exit[0] - d[0]) * 0.02, exit[1] + (exit[1] - d[2]) * 0.02] : exit) as Vec2;
    return [d, [d[0], low, d[2]], [out[0], low, out[1]], [out[0], q[1], out[1]], ...pts.slice(k)];
  };
  let out = path;
  if (p.from && drainAt(p.from)) out = fix(out);
  if (p.to && drainAt(p.to)) out = fix([...out].reverse()).reverse();
  if (p.from && wallPort(p.from)) out = through(out);
  if (p.to && wallPort(p.to)) out = through([...out].reverse()).reverse();
  return out;
}

/** The outward direction of the pool wall nearest to a point (the wall an inlet or skimmer sits in). */
export function poolWallNormal(area: Pick<OutdoorArea, "points">, at: Vec2): Vec2 | null {
  const pts = area.points;
  if (pts.length < 3) return null;
  // the outline's turning sense decides which side of an edge is outside
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  let best: { d: number; n: Vec2 } | null = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dz) / (len * len)));
    const d = Math.hypot(a[0] + dx * t - at[0], a[1] + dz * t - at[1]);
    // left normal (-dz, dx) points inside a counter-clockwise outline in x/z
    const n: Vec2 = sum > 0 ? [dz / len + 0, -dx / len + 0] : [-dz / len + 0, dx / len + 0];  // (+ 0: no negative zero)
    if (!best || d < best.d) best = { d, n };
  }
  return best ? best.n : null;
}

/** Where two segments cross (null: they do not). */
function segHit(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const r: Vec2 = [b[0] - a[0], b[1] - a[1]];
  const s: Vec2 = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
}

/** A pipe with a height per point: an older level one gets its risers as points (the path stays the same). */
export function laidPipe(p: PoolPipe, nodeAt: NodeAt): PoolPipe {
  if (p.heights) return p;
  const h = p.height ?? PIPE_HEIGHT;
  const a = nodeAt(p.from);
  const b = nodeAt(p.to);
  const points: Vec2[] = [...(a ? [[a.x, a.z] as Vec2] : []), ...p.points, ...(b ? [[b.x, b.z] as Vec2] : [])];
  return { ...p, points, heights: points.map(() => h) };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Splits a pipe at a point near it for a T-piece: the first part ends at the new joint, the second starts there
 * (it keeps the id's water direction); ball valves and sight glasses stay where they are.
 */
export function splitPipe(p: PoolPipe, nodeAt: NodeAt, at: P3, jointId: string, newId: string): { joint: PoolJoint; first: PoolPipe; second: PoolPipe } | null {
  const laid = laidPipe(p, nodeAt);
  const path = pipePath(laid, nodeAt);
  const hit = nearestOnPath(path, at);
  if (!hit) return null;
  const joint: PoolJoint = { id: jointId, x: r3(hit.p[0]), z: r3(hit.p[2]), y: r3(hit.p[1]) };
  // the path is [start node?, ...points, end node?]: segment k runs from path[k] to path[k + 1]
  const lead = runLead(laid, nodeAt);
  const cut = Math.max(0, Math.min(laid.points.length, hit.seg + 1 - lead));
  const heights = laid.heights ?? [];
  const fits = laid.fittings ?? [];
  const first: PoolPipe = {
    ...laid,
    to: `joint:${jointId}:in`,
    points: laid.points.slice(0, cut),
    heights: heights.slice(0, cut),
    fittings: fits.filter((f) => f.at <= hit.at),
  };
  const second: PoolPipe = {
    ...laid,
    id: newId,
    from: `joint:${jointId}:out1`,
    points: laid.points.slice(cut),
    heights: heights.slice(cut),
    fittings: fits.filter((f) => f.at > hit.at).map((f) => ({ ...f, at: r3(f.at - hit.at) })),
  };
  return { joint, first, second };
}

/** 1 when a pipe's path starts at its start node (path[k] is then points[k - 1]), 0 for a loose start. */
export function runLead(p: Pick<PoolPipe, "from">, nodeAt: NodeAt): number {
  return p.from && nodeAt(p.from) ? 1 : 0;
}

/** A pipe seen on a wall: its pieces near the wall in wall coordinates (s along, y up), its own points, its fittings. */
export interface WallRun {
  id: string;
  /** k: the piece's index along the path (from path[k] to path[k + 1]); d: the distance in front of the wall. */
  pieces: { k: number; s0: number; y0: number; d0: number; s1: number; y1: number; d1: number }[];
  /** The pipe's own points near the wall (index into its points; an older level pipe: those of laidPipe). */
  points: { i: number; s: number; y: number }[];
  fittings: { id: string; kind: "valve" | "sight"; open: boolean; s: number; y: number }[];
  /** A loose end near the wall (to draw on from). */
  ends: { end: "from" | "to"; s: number; y: number }[];
}

/** How far in front of (and behind) a wall a pipe still counts as running on it. */
const NEAR = 1.6;

export function runsOnWall(frame: WallFrame, pipes: readonly PoolPipe[], nodeAt: NodeAt): WallRun[] {
  const out: WallRun[] = [];
  const near = (q: P3) => {
    const w = toWall(frame, [q[0], q[2]]);
    return w.d > -0.35 && w.d < NEAR && w.s > -0.3 && w.s < frame.length + 0.3 ? w : null;
  };
  for (const p of pipes) {
    const lp = laidPipe(p, nodeAt);
    const path = pipePath(lp, nodeAt);
    if (path.length < 2) continue;
    const run: WallRun = { id: p.id, pieces: [], points: [], fittings: [], ends: [] };
    for (let i = 1; i < path.length; i++) {
      const a = near(path[i - 1]);
      const b = near(path[i]);
      if (a && b) run.pieces.push({ k: i - 1, s0: a.s, y0: path[i - 1][1], d0: a.d, s1: b.s, y1: path[i][1], d1: b.d });
    }
    if (!run.pieces.length) continue;
    const lead = runLead(lp, nodeAt);
    lp.points.forEach((_, i) => {
      const q = path[i + lead];
      const w = q && near(q);
      if (w) run.points.push({ i, s: w.s, y: q[1] });
    });
    const len = pathLength(path);
    for (const f of p.fittings ?? []) {
      const at = Math.min(len, f.at);
      const hit = pointAlong(path, at)?.p;
      const w = hit && near(hit);
      if (hit && w) run.fittings.push({ id: f.id, kind: f.kind, open: f.open !== false, s: w.s, y: hit[1] });
    }
    for (const [end, q] of [
      ["from", path[0]],
      ["to", path[path.length - 1]],
    ] as const) {
      const w = (end === "from" ? !p.from : !p.to) ? near(q) : null;
      if (w) run.ends.push({ end, s: w.s, y: q[1] });
    }
    out.push(run);
  }
  return out;
}

/** A stop on the way of a new connection: a hole it passes, or a ball valve or sight glass put in it. */
/** A hole passed "out" (from inside to outside), "in" (from outside in), or (none) from the side the line comes from. */
export type ConnectVia = { kind: "hole"; joint: string; dir?: "in" | "out" | null } | { kind: "valve" | "sight" };

export interface ConnectRequest {
  from: string;
  vias: ConnectVia[];
  /** One end, or two: then the line splits at a T-piece shortly before them. */
  to: string[];
  floorId: string;
}

/** How deep pipes run under the ground outside. */
export const GROUND_DEPTH = -0.3;

/**
 * Lays a new connection from its stops: pipes from part to part (through each hole from the side it comes from),
 * level then upright – at the higher end's height inside, under the ground outside – and with two ends a T-piece
 * 1 m before their middle. The water runs from where it comes out (`flow` "source") to where it goes in ("sink"):
 * a connection built the other way round is turned. Returns the pipes and joints to add.
 */
export function planConnection(req: ConnectRequest, nodeAt: NodeAt, joints: readonly PoolJoint[], flow: (node: string) => "source" | "sink" | null, newId: (kind: string) => string): { pipes: PoolPipe[]; joints: PoolJoint[] } {
  const pipes: PoolPipe[] = [];
  const added: PoolJoint[] = [];
  const at = (node: string) => nodeAt(node);
  // the chain of nodes: each hole entered on the side nearer to where the line comes from
  type Seg = { a: string; b: string; fits: ("valve" | "sight")[] };
  const segs: Seg[] = [];
  let cur = req.from;
  let fits: ("valve" | "sight")[] = [];
  for (const v of req.vias) {
    if (v.kind !== "hole") {
      fits.push(v.kind);
      continue;
    }
    const j = joints.find((x) => x.id === v.joint);
    const p = at(cur);
    if (!j || !p) continue;
    const inside = at(`joint:${j.id}:inside`)!;
    const outside = at(`joint:${j.id}:outside`)!;
    const fromInside = v.dir ? v.dir === "out" : Math.hypot(p.x - inside.x, p.z - inside.z) <= Math.hypot(p.x - outside.x, p.z - outside.z);
    segs.push({ a: cur, b: `joint:${j.id}:${fromInside ? "inside" : "outside"}`, fits });
    fits = [];
    cur = `joint:${j.id}:${fromInside ? "outside" : "inside"}`;
  }
  let ends = req.to;
  if (ends.length > 1) {
    // two ends: a T-piece 1 m before the middle between them, coming from the last stop
    const p = at(cur);
    const qs = ends.map(at).filter((q): q is NonNullable<typeof q> => !!q);
    if (p && qs.length === ends.length) {
      const mx = qs.reduce((s, q) => s + q.x, 0) / qs.length;
      const mz = qs.reduce((s, q) => s + q.z, 0) / qs.length;
      const l = Math.hypot(p.x - mx, p.z - mz) || 1;
      const k = Math.min(1, l / 2) / l;
      const under = p.y < 0 || qs.some((q) => q.y < 0);
      const tee: PoolJoint = { id: newId("joint"), kind: "tee", x: r3(mx + (p.x - mx) * k), z: r3(mz + (p.z - mz) * k), y: under ? GROUND_DEPTH : r3(p.y) };
      added.push(tee);
      segs.push({ a: cur, b: `joint:${tee.id}:in`, fits });
      fits = [];
      ends.forEach((e, i) => segs.push({ a: `joint:${tee.id}:out${i + 1}`, b: e, fits: [] }));
      ends = [];
    }
  }
  if (ends.length) segs.push({ a: cur, b: ends[0], fits });
  const lookup: NodeAt = (n) => {
    const { kind, id, port } = splitNode(n);
    const j = kind === "joint" ? added.find((x) => x.id === id) : undefined;
    return j ? jointPortAt(j, port) : at(n);
  };
  // the water's way: out of a part that gives water (skimmer, drain, the pump's pressure side, the filter's
  // return …) into one that takes it – a connection built from the other side is turned
  const src = (n: string) => flow(n) === "source";
  const sink = (n: string) => flow(n) === "sink";
  const turn = (req.to.some(src) && !src(req.from)) || (sink(req.from) && !req.to.some(sink));
  for (const s of segs) {
    const p = lookup(s.a);
    const q = lookup(s.b);
    if (!p || !q) continue;
    const route = autoRoute(p, q, holeNormal(s.a, joints), holeNormal(s.b, joints));
    let pipe: PoolPipe = { id: newId("pipe"), from: s.a, to: s.b, floor_id: req.floorId, points: route.map((r): Vec2 => [r[0], r[2]]), heights: route.map((r) => r[1]) };
    // its ball valves and sight glasses from 40 cm along, 25 cm apart (dragged where they belong later)
    const len = pathLength(pipePath(pipe, lookup));
    pipe.fittings = s.fits.map((kind, i) => ({ id: newId("fit"), kind, at: r3(Math.min(len / 2, 0.4 + i * 0.25)), ...(kind === "valve" ? { open: true } : {}) }));
    if (turn) pipe = { ...pipe, from: pipe.to, to: pipe.from, points: [...pipe.points].reverse(), heights: [...(pipe.heights ?? [])].reverse(), fittings: pipe.fittings?.map((f) => ({ ...f, at: r3(Math.max(0, len - f.at)) })) };
    pipes.push(pipe);
  }
  return { pipes, joints: added };
}

/** A hole's normal into the room when a node is the outside of a wall hole (the pipe leaves it straight out). */
function holeNormal(node: string, joints: readonly PoolJoint[]): Vec2 | null {
  const { kind, id, port } = splitNode(node);
  const j = kind === "joint" && port === "outside" ? joints.find((x) => x.id === id) : undefined;
  return j?.kind === "wall" ? [-(j.nx ?? 0), -(j.nz ?? 0)] : null;
}

/**
 * The corner points of a new pipe from p to q: out of a wall hole first 50 cm straight away from the wall, then
 * level – under the ground when one end lies below the floor, else at the higher end's height – along x, then
 * along z; the pipe then runs up or down into q.
 */
export function autoRoute(p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }, outA: Vec2 | null = null, outB: Vec2 | null = null): P3[] {
  const level = p.y < 0 || q.y < 0 ? GROUND_DEPTH : r3(Math.max(p.y, q.y));
  const pts: P3[] = [];
  let [x, z] = [p.x, p.z];
  if (outA) {
    [x, z] = [r3(x + outA[0] * 0.5), r3(z + outA[1] * 0.5)];
    pts.push([x, r3(p.y), z]);
  }
  let [ex, ez] = [q.x, q.z];
  const tail: P3[] = [];
  if (outB) {
    [ex, ez] = [r3(ex + outB[0] * 0.5), r3(ez + outB[1] * 0.5)];
    tail.push([ex, r3(q.y), ez]);
  }
  pts.push([r3(x), level, r3(z)]);
  if (Math.abs(ex - x) > 0.01) pts.push([r3(ex), level, r3(z)]);
  if (Math.abs(ez - z) > 0.01) pts.push([r3(ex), level, r3(ez)]);
  pts.push(...tail);
  // no point twice
  return pts.filter((v, i) => i === 0 || Math.hypot(v[0] - pts[i - 1][0], v[1] - pts[i - 1][1], v[2] - pts[i - 1][2]) > 0.001);
}

/** One connection from a part's connection to the next part: its pipes (through holes), the holes passed and its fittings. */
export interface Connection {
  /** The connection it starts at and the one it reaches ("" a loose end). */
  start: string;
  other: string;
  pipes: string[];
  holes: { joint: string; dir: "in" | "out" }[];
  fittings: ("valve" | "sight")[];
}

/**
 * The connections at a node (a part's connection, or a part as a whole for older pipes): each pipe there followed
 * through the holes it passes to the next part.
 */
export function connectionsAt(pipes: readonly PoolPipe[], joints: readonly PoolJoint[], start: string): Connection[] {
  const isHole = (n: string) => {
    const { kind, id, port } = splitNode(n);
    const j = kind === "joint" && (port === "inside" || port === "outside") ? joints.find((x) => x.id === id) : undefined;
    return j && (j.kind === "wall" || j.kind === "floor") ? { id, port: port as "inside" | "outside" } : null;
  };
  const out: Connection[] = [];
  for (const first of pipes.filter((p) => p.from === start || p.to === start)) {
    const c: Connection = { start, other: "", pipes: [], holes: [], fittings: [] };
    let pipe: PoolPipe | undefined = first;
    let at = start;
    const seen = new Set<string>();
    while (pipe && !seen.has(pipe.id)) {
      seen.add(pipe.id);
      c.pipes.push(pipe.id);
      c.fittings.push(...(pipe.fittings ?? []).map((f) => f.kind));
      const next: string = pipe.from === at ? pipe.to : pipe.from;
      const hole = next ? isHole(next) : null;
      if (!hole) {
        c.other = next;
        break;
      }
      // through the hole: on with the pipe at its other side
      c.holes.push({ joint: hole.id, dir: hole.port === "inside" ? "out" : "in" });
      at = `joint:${hole.id}:${hole.port === "inside" ? "outside" : "inside"}`;
      const cur: PoolPipe = pipe;
      pipe = pipes.find((p) => p !== cur && (p.from === at || p.to === at));
      if (!pipe) c.other = at;
    }
    out.push(c);
  }
  return out;
}
