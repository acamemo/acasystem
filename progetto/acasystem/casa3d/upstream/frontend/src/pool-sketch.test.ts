import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutdoorArea, PoolPipe } from "./model.ts";
import { autoPort, feedDone, nodeFlow, orientPipe, sketchIssues } from "./pool-sketch.ts";

const pipe = (id: string, from: string, to: string): PoolPipe => ({ id, from, to, floor_id: "eg", points: [[0, 0]], heights: [0.3] });
const devices = [
  { id: "pump", type: "pool_pump" },
  { id: "filter", type: "pool_filter" },
  { id: "wp", type: "pool_heat_pump" },
];
const area = (pipes: PoolPipe[], joints: OutdoorArea["pool"] extends infer L ? (L extends { joints?: infer J } ? J : never) : never = []): Pick<OutdoorArea, "pool"> => ({
  pool: {
    ports: [
      { id: "sk", kind: "skimmer", x: 0, z: 0 },
      { id: "bd", kind: "drain", x: 1, z: 1 },
      { id: "in1", kind: "inlet", x: 2, z: 0 },
      { id: "in2", kind: "inlet", x: 2, z: 2 },
    ],
    pipes,
    joints,
  },
});

test("a line drawn to a device as a whole takes the connection its other end asks for", () => {
  assert.equal(autoPort("pool_pump", "source", false), "suction");
  assert.equal(autoPort("pool_pump", "sink", false), "pressure");
  assert.equal(autoPort("pool_filter", "source", false), "pump");
  assert.equal(autoPort("pool_filter", "sink", false), "return");
  assert.equal(autoPort("pool_filter", "sink", true), "waste");
  assert.equal(autoPort("pool_heat_pump", "source", false), "in");
  // the return already taken: the next free one of the same direction
  assert.equal(autoPort("pool_filter", "sink", false, ["return"]), "waste");
  // never the other direction: a second suction line goes to the suction side too
  assert.equal(autoPort("pool_pump", "source", false, ["suction"]), "suction");
  assert.equal(autoPort("pool_valve", "sink", false), null);
});

test("the water's way at a node: pool ports, device connections, holes by what lies behind them, T-pieces by their side", () => {
  const joints = [
    { id: "h_sk", kind: "floor" as const, x: 0, z: 0, y: 0 },
    { id: "h_in", kind: "wall" as const, x: 0, z: 0, y: 0.5, nx: 1, nz: 0 },
    { id: "t_saug", kind: "tee" as const, x: 0, z: 0, y: 0.3 },
    { id: "t_ret", kind: "tee" as const, x: 0, z: 0, y: 0.3 },
  ];
  const a = area(
    [
      pipe("1", "port:sk", "joint:h_sk:outside"),
      pipe("2", "joint:h_in:outside", "port:in1"),
      pipe("3", "joint:h_sk:inside", "joint:t_saug:in"),
      pipe("4", "joint:t_saug:out1", "dev:pump:suction"),
      pipe("5", "dev:filter:return", "joint:t_ret:in"),
    ],
    joints,
  );
  assert.equal(nodeFlow("port:sk", a, devices), "source");
  assert.equal(nodeFlow("port:in1", a, devices), "sink");
  assert.equal(nodeFlow("dev:pump:pressure", a, devices), "source");
  // inside the room: the skimmer's line brings water, the inlets' line takes it
  assert.equal(nodeFlow("joint:h_sk:inside", a, devices), "source");
  assert.equal(nodeFlow("joint:h_in:inside", a, devices), "sink");
  // a T on the suction side takes a further suction line, one on the return side gives water to a branch
  assert.equal(nodeFlow("joint:t_saug:out2", a, devices), "sink");
  assert.equal(nodeFlow("joint:t_ret:out1", a, devices), "source");
  assert.equal(nodeFlow("dev:pump", a, devices), null);
});

test("a pipe drawn against the water is turned; unknown or conflicting ends leave it", () => {
  const p = { ...pipe("x", "dev:pump:suction", "joint:h:inside"), points: [[0, 0], [1, 0]] as [number, number][], heights: [0.2, 0.4] };
  const turned = orientPipe(p, "sink", "source");
  assert.equal(turned.from, "joint:h:inside");
  assert.deepEqual(turned.points, [[1, 0], [0, 0]]);
  assert.deepEqual(turned.heights, [0.4, 0.2]);
  assert.equal(orientPipe(p, "source", "sink"), p);
  assert.equal(orientPipe(p, null, null), p);
  assert.equal(orientPipe(p, "source", "source"), p);
});

test("what is missing: loose ends, open device connections, pool lines not brought in", () => {
  const a = area([pipe("1", "port:sk", "dev:pump:suction"), pipe("2", "dev:pump:pressure", "")]);
  const issues = sketchIssues(a, devices).map((i) => `${i.kind}:${i.node}`);
  assert.ok(issues.includes("loose:2"));
  assert.ok(issues.includes("port:dev:filter:pump"));
  assert.ok(issues.includes("feed:drain") && issues.includes("feed:inlet"));
  assert.ok(!issues.includes("feed:skimmer"));
  // a heat pump without any pipe is not missing
  assert.ok(!issues.some((i) => i.startsWith("port:dev:wp")));
  assert.equal(feedDone(a, "skimmer"), true);
  assert.equal(feedDone(a, "inlet"), false);
});
