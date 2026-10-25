// Robot vacuum maps from Valetudo (ValetudoMap JSON, "Download map" or /api/v2/robot/state/map): every segment is a
// room, given as pixels (run-length compressed in newer versions) of `pixelSize` centimetres. The rooms are the
// floor areas the robot reached – with notches where furniture stood – so the areas are first closed (small
// notches and holes filled), then outlined, simplified and squared up. Neighbours lie a wall apart.

import type { Vec2 } from "../model.ts";
import type { RawPlan, RawRoom } from "./builder.ts";
import { cleanPolygon, simplify, squareUp, traceCells } from "./geom.ts";

interface Layer {
  type?: string;
  pixels?: number[];
  compressedPixels?: number[];
  metaData?: { segmentId?: string | number; name?: string };
}

export function isValetudo(data: unknown): boolean {
  const d = data as { __class?: string; layers?: unknown };
  return d?.__class === "ValetudoMap" || (Array.isArray(d?.layers) && (d.layers as Layer[]).some((l) => l?.type === "segment" || l?.type === "floor"));
}

function cellsOf(l: Layer): Set<string> {
  const cells = new Set<string>();
  if (l.compressedPixels?.length) {
    const c = l.compressedPixels;
    for (let k = 0; k + 2 < c.length; k += 3) for (let n = 0; n < c[k + 2]; n++) cells.add(`${c[k] + n},${c[k + 1]}`);
  } else if (l.pixels?.length) {
    for (let k = 0; k + 1 < l.pixels.length; k += 2) cells.add(`${l.pixels[k]},${l.pixels[k + 1]}`);
  }
  return cells;
}

/** Morphological closing (grow by r cells, then shrink by r): notches and holes narrower than 2r are filled. */
function close(cells: Set<string>, r: number): Set<string> {
  if (!cells.size) return cells;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of cells) {
    const [x, y] = c.split(",").map(Number);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const pad = r + 1;
  const w = x1 - x0 + 1 + 2 * pad;
  const h = y1 - y0 + 1 + 2 * pad;
  let grid: Uint8Array = new Uint8Array(w * h);
  for (const c of cells) {
    const [x, y] = c.split(",").map(Number);
    grid[(y - y0 + pad) * w + (x - x0 + pad)] = 1;
  }
  // one pass of a square brush, separably: along x, then along y
  const pass = (src: Uint8Array, grow: boolean): Uint8Array => {
    const a = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = grow ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = x + k;
          const s = xx < 0 || xx >= w ? 0 : src[y * w + xx];
          if (grow ? s : !s) {
            v = grow ? 1 : 0;
            break;
          }
        }
        a[y * w + x] = v;
      }
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = grow ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const yy = y + k;
          const s = yy < 0 || yy >= h ? 0 : a[yy * w + x];
          if (grow ? s : !s) {
            v = grow ? 1 : 0;
            break;
          }
        }
        b[y * w + x] = v;
      }
    return b;
  };
  grid = pass(pass(grid, true), false);
  const out = new Set<string>();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grid[y * w + x]) out.add(`${x + x0 - pad},${y + y0 - pad}`);
  return out;
}

export function readValetudo(data: unknown, lang = "de"): RawPlan {
  const d = data as { pixelSize?: number; layers?: Layer[] };
  const px = (d.pixelSize ?? 5) / 100;
  const de = lang.startsWith("de");
  let layers = (d.layers ?? []).filter((l) => l.type === "segment");
  // a map without rooms (no segmentation yet): the whole floor area as one room
  if (!layers.length) layers = (d.layers ?? []).filter((l) => l.type === "floor").map((l) => ({ ...l, metaData: { name: de ? "Wohnung" : "Home" } }));
  if (!layers.length) throw new Error("nothing_found");
  // notches up to about 40 cm (a sofa's legs, a cupboard the robot drove round) are filled
  const r = Math.max(1, Math.round(0.2 / px));
  const rooms: RawRoom[] = [];
  layers.forEach((l, i) => {
    const raw = cellsOf(l);
    if (raw.size < 20) return;
    const outline = traceCells(close(raw, r));
    // the staircase of pixel edges smoothed into straight walls, nearly square corners made square
    const pts = cleanPolygon(squareUp(simplify(outline, 2.5).map(([x, y]) => [x * px, y * px] as Vec2), 8));
    if (pts.length < 3) return;
    rooms.push({ name: l.metaData?.name?.trim() || `${de ? "Raum" : "Room"} ${i + 1}`, points: pts });
  });
  if (!rooms.length) throw new Error("nothing_found");
  return { source: "Valetudo", floors: [{ name: de ? "Erdgeschoss" : "Ground floor", elevation: 0, rooms, walls: [], openings: [], furniture: [] }], roomsAtInnerFaces: true, align: true, warnings: [{ code: "robot_map" }] };
}
