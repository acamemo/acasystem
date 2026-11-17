import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyChanges,
  diffConfiguration,
  resourcesForChanges,
  resourcesForTarget,
  widgetExists,
} from "./profileResources.ts";

const configuration = () => ({
  snapshot: {
    layout: {
      launcherLayout: {
        pages: [{ id: "home", order: ["one", "two"], placements: {} }],
      },
      cardSettings: {
        "home::one": {
          categoryWidgetType: "light",
          bindingEntityId: "light.cucina",
          heading: "Uno",
        },
        "home::two": {
          categoryWidgetType: "light",
          bindingEntityId: "light.cucina",
          heading: "Due",
        },
      },
      customNames: {},
      customIcons: {},
      widgetMemory: { entries: {}, touched: {} },
    },
  },
});

test("patch mirate preservano modifiche indipendenti e il diff tratta liste atomiche", () => {
  const base = configuration();
  const first = applyChanges(base, [
    { path: ["snapshot", "layout", "customNames", "one"], value: "Cucina" },
  ]);
  const second = applyChanges(first, [
    { path: ["snapshot", "layout", "customNames", "two"], value: "Tavolo" },
  ]);
  assert.deepEqual(second.snapshot.layout.customNames, {
    one: "Cucina",
    two: "Tavolo",
  });
  assert.deepEqual(base.snapshot.layout.customNames, {});
  const after = applyChanges(base, [
    { path: ["snapshot", "layout", "launcherLayout", "pages"], value: [] },
  ]);
  assert.deepEqual(
    diffConfiguration(base, after).map((change) => change.path),
    [["snapshot", "layout", "launcherLayout", "pages"]],
  );
  assert.deepEqual(applyChanges(base, diffConfiguration(base, second)), second);
});

test("nessun percorso o valore può modificare il prototipo", () => {
  for (const key of ["__proto__", "prototype", "constructor"]) {
    assert.throws(
      () => applyChanges({}, [{ path: [key, "polluted"], value: true }]),
      /ammess/,
    );
    assert.throws(
      () =>
        applyChanges({}, [
          { path: ["valid"], value: JSON.parse('{"' + key + '":{}}') },
        ]),
      /ammess/,
    );
  }
  assert.throws(
    () => applyChanges({ values: [] }, [{ path: ["values", "0"], value: "x" }]),
    /attraversa/,
  );
  assert.equal({}.polluted, undefined);
});

test("widget e gruppi usano il tipo e il binding entità ADR0019, anche dopo un riassociazione", () => {
  const base = configuration();
  const target = { kind: "widget", pageId: "home", widgetId: "one" };
  assert.deepEqual(resourcesForTarget(base, target), [
    "device:light:light.cucina",
    "widget:one",
    "widget:two",
  ]);
  const changes = [
    {
      path: [
        "snapshot",
        "layout",
        "cardSettings",
        "home::one",
        "bindingEntityId",
      ],
      value: "light.sala",
    },
  ];
  assert.deepEqual(
    resourcesForChanges(base, applyChanges(base, changes), changes),
    ["device:light:light.cucina", "device:light:light.sala", "widget:one"],
  );
  assert.deepEqual(
    resourcesForChanges(base, base, [
      { path: ["appearance", "theme"], value: "dark" },
    ]),
    ["profile"],
  );
});

test("un widget eliminato non esiste per il solo fatto di avere impostazioni archiviate", () => {
  const base = configuration();
  const target = { kind: "widget", pageId: "home", widgetId: "one" };
  assert.equal(widgetExists(base, target), true);
  base.snapshot.layout.launcherLayout.pages[0].order = ["two"];
  assert.equal(widgetExists(base, target), false);
});

test("una pila canonica protegge anche i membri e il target senza pagina cerca fra le pagine vive", () => {
  const base = configuration();
  base.snapshot.layout.launcherLayout.stacks = { stack_one: { ids: ["one", "two"] } };
  base.snapshot.layout.launcherLayout.pages[0].order = ["stack_one"];
  assert.equal(widgetExists(base, { kind: "widget", widgetId: "two" }), true);
  assert.equal(widgetExists(base, { kind: "widget", widgetId: "two", pageId: "missing" }), false);
  base.snapshot.layout.launcherLayout.pages = [];
  assert.equal(widgetExists(base, { kind: "widget", widgetId: "two" }), false);
});
