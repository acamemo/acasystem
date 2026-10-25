// Pool Pro, "Technik zeichnen": the rules that make drawing the technical room easy. Lines are drawn from part to
// part on a wall; these pure functions decide which connection of a device a line belongs to, which way the water
// runs in it, what still hangs loose, and which of the pool's lines already come into the room.

import type { OutdoorArea, PoolJoint, PoolPipe } from "./model.ts";
import { devicePorts, nodePart, portFlow, poolPortFlow, splitNode, type PortName } from "./pool-ports.ts";

type Flow = "source" | "sink" | null;
type Device = { id: string; type: string };

/** Which way the water goes at a node for a new line: out of it ("source") or into it ("sink"); null: unknown. */
export function nodeFlow(node: string, area: Pick<OutdoorArea, "pool">, devices: readonly Device[]): Flow {
  const links = area.pool ?? {};
  const pipes = links.pipes ?? [];
  const { kind, id, port } = splitNode(node);
  if (kind === "port") {
    const q = links.ports?.find((x) => x.id === id);
    return q ? poolPortFlow(q.kind) : null;
  }
  if (kind === "dev") return port ? portFlow(port) : null;
  if (kind !== "joint") return null;
  const j = links.joints?.find((x) => x.id === id);
  if (!j) return null;
  if (j.kind === "wall" || j.kind === "floor") {
    // a hole passes on what its other side carries, told by the pipe already there (laid the water's way): water
    // coming in through it (the skimmer's line) is a source inside, water going out (to the inlets) a sink
    const other = `joint:${id}:${port === "outside" ? "inside" : "outside"}`;
    const p = pipes.find((x) => x.from === other || x.to === other);
    if (p) return p.to === other ? "source" : "sink";
    const end = farEnd(pipes, links.joints ?? [], other);
    return end ? nodeFlow(end, area, devices) : null;
  }
  // a T- or Y-piece: on the suction side (it reaches a pump downstream) a new branch brings water into it,
  // on the pressure side one takes water from it
  const part = `joint:${id}`;
  return reachesPump(part, pipes, devices) ? "sink" : pipes.some((p) => nodePart(p.to) === part) ? "source" : null;
}

/** The part a line through holes ends at, seen from one side of a hole ("" none). */
function farEnd(pipes: readonly PoolPipe[], joints: readonly PoolJoint[], start: string): string {
  let at = start;
  const seen = new Set<string>();
  for (;;) {
    const p = pipes.find((x) => !seen.has(x.id) && (x.from === at || x.to === at));
    if (!p) return "";
    seen.add(p.id);
    const next = p.from === at ? p.to : p.from;
    const { kind, id, port } = splitNode(next);
    const j = kind === "joint" ? joints.find((x) => x.id === id) : undefined;
    if (j && (j.kind === "wall" || j.kind === "floor") && (port === "inside" || port === "outside")) {
      at = `joint:${id}:${port === "inside" ? "outside" : "inside"}`;
      continue;
    }
    return next;
  }
}

/** Whether water from a part flows on (along the pipes' directions) to a pump without passing one first. */
function reachesPump(part: string, pipes: readonly PoolPipe[], devices: readonly Device[]): boolean {
  const pump = new Set(devices.filter((d) => d.type === "pool_pump").map((d) => `dev:${d.id}`));
  const seen = new Set<string>();
  const walk = (n: string): boolean => {
    if (pump.has(n)) return true;
    if (seen.has(n)) return false;
    seen.add(n);
    return pipes.filter((p) => nodePart(p.from) === n).some((p) => walk(nodePart(p.to)));
  };
  return pipes.filter((p) => nodePart(p.from) === part).some((p) => walk(nodePart(p.to)));
}

/**
 * The connection of a device a line drawn to the device as a whole belongs to, from what the line's other end does:
 * water coming in takes the pump's suction side, the filter's inlet from the pump, the heat pump's in; water going
 * out leaves by the pressure side, the filter's return (its waste when the line goes to the drain), the heat pump's out.
 * Ports already taken are skipped when another one fits.
 */
export function autoPort(type: string, other: Flow, toWaste: boolean, taken: readonly PortName[] = []): PortName | null {
  const ports = devicePorts(type);
  if (!ports.length) return null;
  const wantIn = other === "source";
  const order: PortName[] =
    type === "pool_pump"
      ? wantIn
        ? ["suction", "pressure"]
        : ["pressure", "suction"]
      : type === "pool_filter"
        ? wantIn
          ? ["pump", "return", "waste"]
          : toWaste
            ? ["waste", "return", "pump"]
            : ["return", "waste", "pump"]
        : wantIn
          ? ["in", "out"]
          : ["out", "in"];
  // never a connection of the other direction: a second suction line also goes to the suction side
  const right = order.filter((q) => portFlow(q) === (wantIn ? "sink" : "source"));
  return right.find((q) => !taken.includes(q)) ?? right[0] ?? order[0];
}

/** A pipe turned so the water runs from its source end to its sink end (unchanged when that is already so or unknown). */
export function orientPipe(p: PoolPipe, fromFlow: Flow, toFlow: Flow): PoolPipe {
  // turned only when an end says so and neither end says the opposite
  const turn = (fromFlow === "sink" || toFlow === "source") && fromFlow !== "source" && toFlow !== "sink";
  if (!turn) return p;
  return {
    ...p,
    from: p.to,
    to: p.from,
    points: [...p.points].reverse(),
    heights: p.heights ? [...p.heights].reverse() : p.heights,
  };
}

/** What the drawing still lacks: loose pipe ends, device connections without a pipe, pool lines not brought in. */
export interface SketchIssue {
  kind: "loose" | "port" | "feed";
  /** The node concerned (a device's connection, a pool port kind for "feed"). */
  node: string;
}

export function sketchIssues(area: Pick<OutdoorArea, "pool">, devices: readonly Device[]): SketchIssue[] {
  const links = area.pool ?? {};
  const pipes = links.pipes ?? [];
  const out: SketchIssue[] = [];
  for (const p of pipes) {
    if (!p.from) out.push({ kind: "loose", node: p.id });
    if (!p.to) out.push({ kind: "loose", node: p.id });
  }
  const used = new Set(pipes.flatMap((p) => [p.from, p.to]));
  for (const d of devices) {
    if (!["pool_pump", "pool_filter", "pool_heat_pump"].includes(d.type)) continue;
    // the filter's waste only matters once a waste drain exists; a heat pump without any pipe is left alone
    const ports = devicePorts(d.type).filter((q) => !(d.type === "pool_filter" && q === "waste" && !(links.ports ?? []).some((x) => x.kind === "waste")));
    const any = [...used].some((n) => nodePart(n) === `dev:${d.id}`);
    if (d.type === "pool_heat_pump" && !any) continue;
    for (const q of ports) if (!used.has(`dev:${d.id}:${q}`) && !used.has(`dev:${d.id}`)) out.push({ kind: "port", node: `dev:${d.id}:${q}` });
  }
  for (const k of ["skimmer", "drain", "inlet"] as const) {
    const ports = (links.ports ?? []).filter((q) => q.kind === k);
    if (ports.some((q) => !used.has(`port:${q.id}`))) out.push({ kind: "feed", node: k });
  }
  return out;
}

/** Whether a pool line ("skimmer", "drain", "inlet", "waste") is already brought into the room (all its ports have a pipe). */
export function feedDone(area: Pick<OutdoorArea, "pool">, kind: string): boolean {
  const links = area.pool ?? {};
  const ports = (links.ports ?? []).filter((q) => q.kind === kind);
  const used = new Set((links.pipes ?? []).flatMap((p) => [p.from, p.to]));
  return ports.length > 0 && ports.every((q) => used.has(`port:${q.id}`));
}
