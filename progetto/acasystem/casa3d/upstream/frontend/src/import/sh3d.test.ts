import assert from "node:assert/strict";
import { test } from "node:test";
import { readSh3d } from "./sh3d.ts";
import { buildPlan } from "./builder.ts";
import { makeZip } from "./test-util.ts";
import { polygonArea } from "../model.ts";

// a 10 × 8 m house (wall centre lines), 30 cm outer walls, a 12 cm inner wall at x = 6 m; rooms drawn at the inner
// faces as Sweet Home 3D does; a door between the rooms, a window, a front door, furniture, and an upper floor
const HOME = `<?xml version='1.0'?>
<home version='7000' wallHeight='250'>
  <level id='L0' name='Erdgeschoss' elevation='0' floorThickness='12' height='250' elevationIndex='0'/>
  <level id='L1' name='Obergeschoss' elevation='262' floorThickness='12' height='240' elevationIndex='0'/>
  <wall id='w1' level='L0' xStart='0' yStart='0' xEnd='1000' yEnd='0' height='250' thickness='30'/>
  <wall id='w2' level='L0' xStart='1000' yStart='0' xEnd='1000' yEnd='800' height='250' thickness='30'/>
  <wall id='w3' level='L0' xStart='1000' yStart='800' xEnd='0' yEnd='800' height='250' thickness='30'/>
  <wall id='w4' level='L0' xStart='0' yStart='800' xEnd='0' yEnd='0' height='250' thickness='30'/>
  <wall id='w5' level='L0' xStart='600' yStart='0' xEnd='600' yEnd='800' height='250' thickness='12'/>
  <room id='r1' level='L0' name='Wohnzimmer &amp; Essen'><point x='15' y='15'/><point x='594' y='15'/><point x='594' y='785'/><point x='15' y='785'/></room>
  <room id='r2' level='L0' name='Küche'><point x='606' y='15'/><point x='985' y='15'/><point x='985' y='785'/><point x='606' y='785'/></room>
  <doorOrWindow id='d1' level='L0' catalogId='eTeks#door' name='Door' x='600' y='400' elevation='0' width='90' depth='12' height='210' angle='1.5708'/>
  <doorOrWindow id='d2' level='L0' catalogId='eTeks#window' name='Window' x='300' y='0' elevation='90' width='120' depth='30' height='130' angle='0'/>
  <doorOrWindow id='d3' level='L0' catalogId='eTeks#frontDoor' name='Front door' x='800' y='800' elevation='0' width='100' depth='30' height='210' angle='3.14159'/>
  <pieceOfFurniture id='f1' level='L0' catalogId='eTeks#doubleBed' name='Double bed' x='300' y='500' elevation='0' width='160' depth='200' height='50' angle='0'/>
  <pieceOfFurniture id='f2' level='L0' catalogId='eTeks#sofa' name='Sofa' x='450' y='200' elevation='0' width='200' depth='90' height='80' angle='3.14159'/>
  <furnitureGroup id='g1' level='L0' name='Gruppe'>
    <pieceOfFurniture id='f3' level='L0' name='Kaminofen' x='900' y='700' elevation='0' width='50' depth='50' height='110' angle='0'/>
  </furnitureGroup>
  <light id='l1' level='L0' catalogId='eTeks#ceilingLight' name='Ceiling light' x='300' y='300' elevation='235' width='40' depth='40' height='15' angle='0' power='0.5'/>
  <wall id='w6' level='L1' xStart='0' yStart='0' xEnd='1000' yEnd='0' thickness='30'/>
  <wall id='w7' level='L1' xStart='1000' yStart='0' xEnd='1000' yEnd='800' thickness='30'/>
  <wall id='w8' level='L1' xStart='1000' yStart='800' xEnd='0' yEnd='800' thickness='30'/>
  <wall id='w9' level='L1' xStart='0' yStart='800' xEnd='0' yEnd='0' thickness='30'/>
  <room id='r3' level='L1' name='Studio'><point x='15' y='15'/><point x='985' y='15'/><point x='985' y='785'/><point x='15' y='785'/></room>
</home>`;

test("a Sweet Home 3D house: floors, joined rooms, doors and windows on their edges, furniture", async () => {
  const raw = await readSh3d(makeZip({ Home: "binary", "Home.xml": HOME }));
  assert.equal(raw.floors.length, 2);
  const { building: b, stats, warnings } = buildPlan(raw);
  assert.equal(stats.floors, 2);
  const [eg, og] = b.floors;
  assert.equal(eg.name, "Erdgeschoss");
  assert.equal(og.name, "Obergeschoss");
  assert.equal(eg.elevation, 0);
  assert.equal(og.elevation, 2.62);
  assert.equal(og.height, 2.4);
  assert.deepEqual(
    eg.rooms.map((r) => r.name),
    ["Wohnzimmer & Essen", "Küche"],
  );
  // the 12 cm between the rooms became one wall: both rooms meet at x = 6 m
  const xs = (i: number) => eg.rooms[i].points.map((p) => p[0]);
  assert.ok(Math.abs(Math.max(...xs(0)) - 6) < 0.005, String(xs(0)));
  assert.ok(Math.abs(Math.min(...xs(1)) - 6) < 0.005, String(xs(1)));
  assert.equal(b.settings.wall_exterior, 0.3);
  assert.equal(b.settings.wall_interior, 0.12);
  // no free walls: every wall runs along a room edge
  assert.equal(eg.walls?.length, 0);
  // the openings: a door on the shared edge, the window and the front door on outer edges
  assert.equal(eg.openings.length, 3);
  const door = eg.openings.find((o) => o.type === "door" && o.width === 0.9)!;
  const win = eg.openings.find((o) => o.type === "window")!;
  const front = eg.openings.find((o) => o.width === 1)!;
  assert.ok(door && win && front);
  assert.equal(win.sill, 0.9);
  assert.equal(win.height, 1.3);
  assert.equal(front.type, "door");
  const room = (id: string) => eg.rooms.find((r) => r.id === id)!;
  const edgeMid = (o: (typeof eg.openings)[number]) => {
    const r = room(o.room_id);
    const a = r.points[o.edge];
    const c = r.points[(o.edge + 1) % r.points.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    return [a[0] + ((c[0] - a[0]) * o.offset) / len, a[1] + ((c[1] - a[1]) * o.offset) / len];
  };
  const [dx, dz] = edgeMid(door);
  assert.ok(Math.abs(dx - 6) < 0.01 && Math.abs(dz - 4) < 0.01, `door at ${dx},${dz}`);
  const [wx, wz] = edgeMid(win);
  assert.ok(Math.abs(wx - 3) < 0.01 && Math.abs(wz - 0.15) < 0.01, `window at ${wx},${wz}`);
  // furniture: known kinds mapped, the unknown stove kept as a cabinet with its own name, the lamp a ceiling lamp
  const types = eg.furniture.map((f) => f.type).sort();
  assert.deepEqual(types, ["bed", "lamp_ceiling", "sideboard", "sofa"]);
  assert.equal(eg.furniture.find((f) => f.type === "sofa")!.rotation, 180);
  assert.equal(eg.furniture.find((f) => f.type === "sideboard")!.name, "Kaminofen");
  assert.ok(warnings.some((w) => w.code === "furniture_unknown"));
  assert.equal(og.rooms.length, 1);
  assert.ok(Math.abs(polygonArea(og.rooms[0].points) - 9.7 * 7.7) < 0.01);
});

test("a Sweet Home 3D file with walls but no rooms: the rooms are found between the walls", async () => {
  const noRooms = HOME.replace(/<room[\s\S]*?<\/room>/g, "");
  const { building: b } = buildPlan(await readSh3d(makeZip({ "Home.xml": noRooms }, false)));
  const eg = b.floors[0];
  assert.equal(eg.rooms.length, 2);
  const areas = eg.rooms.map((r) => Math.round(polygonArea(r.points))).sort((a, c) => a - c);
  assert.deepEqual(areas, [32, 48]);
  // the doors still find their edges
  assert.equal(eg.openings.length, 3);
});

test("an old Sweet Home 3D file without Home.xml is told apart", async () => {
  await assert.rejects(readSh3d(makeZip({ Home: "x" })), /sh3d_old/);
});
