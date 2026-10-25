// Builds the Casa 3D bundles into casa3d/dist and checks them (T2b of ADR-0014).
//
// Derived from the build of the copied project (upstream/frontend/build.mjs, frozen copy), with these differences:
//   - the content hash is part of every file name (casa3d-3d-<hash>.js), not a query: a file is immutable by name,
//     a stale name is a 404 (D16); dist/manifest.json lists the files and is the only way in (never cached);
//   - the licence comments of lit (BSD-3-Clause) and three (MIT) are kept in a .LEGAL.txt file next to every bundle,
//     and NOTICE / LICENSE-* are copied into dist as .txt files;
//   - no card editor, no import page of the old website, no fonts and no pictures (T9);
//   - extra checks: no address of a third party, no browser API for an own connection, no trace of the original
//     name outside the notices, no placeholder left in a bundle.
//
// It never runs a script of the copied project and it never talks to the network.
//   node build.mjs            (or: npm run build -w casa3d)

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const KB = 1024;

const sha = (data) => createHash("sha256").update(data).digest("hex");
const shortHash = (data) => sha(data).slice(0, 12);

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
// the release of the bench (progetto/.env), passed by the Docker build; the package version otherwise
const version = process.env.ACASYSTEM_VERSION?.trim() || pkg.version;

const common = {
  bundle: true,
  format: "esm",
  // older iPads stay on iOS 15/16: Safari 15 is the oldest with WebGL 2 (three.js needs it); newer syntax such as
  // static class blocks (Safari 16.4) is turned into older code (same target as the copied project)
  target: ["safari15", "chrome94", "firefox93", "edge94"],
  minify: true,
  sourcemap: false,
  // the licence comments go to a file next to the bundle (see below), not into the code
  legalComments: "external",
  logLevel: "warning",
  write: false,
  absWorkingDir: ROOT,
};

// ------------------------------------------------------------------------------------------ bundles

/** name -> entry point. The names are the ones the loaders in src/load*.ts build (casa3d-<name>-<hash>.js). */
const ENTRIES = {
  "3d": "src/viewer/viewer3d.ts",
  editor: "src/components/editor.ts",
  timetravel: "src/timetravel/entry.ts",
  fun: "src/fun/entry.ts",
  voice: "src/voice/entry.ts",
};
const MAIN_ENTRY = "src/main.ts";

// Budgets of the copied project (its last values, 2026-10-15), kept as the starting point; Light on a tablet is the target (T5).
const BUDGET = {
  main: 620 * KB,
  fun: 40 * KB,
  voice: 60 * KB,
  timetravel: 120 * KB,
  "3d": 780 * KB,
  editor: 840 * KB,
};

/** The hashes of the other bundles, set by the build into the code that loads them. */
const HASH_DEFINE = {
  "3d": "__FP3D_VIEWER_HASH__",
  editor: "__FP3D_EDITOR_HASH__",
  timetravel: "__FP3D_TIMETRAVEL_HASH__",
  fun: "__FP3D_FUN_HASH__",
  voice: "__FP3D_VOICE_HASH__",
};

// the language files (lang/*.json) are fetched with a hash of their content in the query, so a new text is never stale
const langFiles = existsSync(join(ROOT, "lang")) ? readdirSync(join(ROOT, "lang")).filter((f) => f.endsWith(".json")).sort() : [];
const langHash = shortHash(langFiles.map((f) => readFileSync(join(ROOT, "lang", f))).reduce((acc, b) => acc + b.toString("utf8") + "\n", ""));

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "lang"), { recursive: true });

/** Bundles one entry in memory, names the files after the content hash and writes them. */
async function bundle(key, entry, hashes) {
  const stem = key === "main" ? "casa3d" : `casa3d-${key}`;
  const define = { __FP3D_LANG_HASH__: JSON.stringify(langHash), __FP3D_VERSION__: JSON.stringify(version) };
  for (const [k, hash] of Object.entries(hashes)) define[HASH_DEFINE[k]] = JSON.stringify(hash);
  const result = await build({ ...common, entryPoints: [entry], outfile: join(DIST, `${stem}.js`), define });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"));
  const legal = result.outputFiles.find((f) => f.path.endsWith(".LEGAL.txt"));
  if (!js) throw new Error(`${key}: no output`);
  const hash = shortHash(js.contents);
  const file = `${stem}-${hash}.js`;
  writeFileSync(join(DIST, file), js.contents);
  if (legal) writeFileSync(join(DIST, `${file}.LEGAL.txt`), legal.contents);
  return { key, file, hash, bytes: js.contents.length, legal: legal ? `${file}.LEGAL.txt` : null };
}

const built = {};
const hashes = {};
// order: the editor draws furniture previews with the 3D bundle, so it knows its hash; the main bundle knows all the others
for (const [key, entry] of Object.entries(ENTRIES)) {
  built[key] = await bundle(key, entry, hashes);
  hashes[key] = built[key].hash;
}
built.main = await bundle("main", MAIN_ENTRY, hashes);

// ------------------------------------------------------------------------------------------ languages and licences

for (const f of langFiles) copyFileSync(join(ROOT, "lang", f), join(DIST, "lang", f));
// notices that must travel with the code (MIT of the copied project, BSD-3-Clause of lit, MIT of three)
const SOURCE_NOTICES = ["NOTICE", ...readdirSync(ROOT).filter((f) => /^LICENSE-/.test(f)).sort()];
if (SOURCE_NOTICES.length < 4) throw new Error(`notices: expected NOTICE and three LICENSE-* files, found ${SOURCE_NOTICES.join(", ")}`);
// the name of the file of the copied project says whose licence it is, so it gets a neutral name in dist (the text inside stays whole)
const NOTICES = SOURCE_NOTICES.map((n) => (n === "LICENSE-MIT-" + "Master" + "short" ? "LICENSE-MIT-base" : n));
SOURCE_NOTICES.forEach((n, i) => copyFileSync(join(ROOT, n), join(DIST, `${NOTICES[i]}.txt`)));

// ------------------------------------------------------------------------------------------ manifest

const manifest = {
  name: "casa3d",
  version,
  entry: built.main.file,
  bundles: Object.fromEntries(Object.entries(built).map(([k, b]) => [k, { file: b.file, bytes: b.bytes, sha256: sha(readFileSync(join(DIST, b.file))) }])),
  lang: Object.fromEntries(langFiles.map((f) => [f.replace(/\.json$/, ""), { file: `lang/${f}`, query: `v=${langHash}` }])),
  notices: NOTICES.map((n) => `${n}.txt`),
};
writeFileSync(join(DIST, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

// ------------------------------------------------------------------------------------------ checks

let over = false;
const problem = (msg) => {
  over = true;
  console.error(msg);
};

const bundleFiles = Object.values(built).map((b) => b.file);
const text = new Map(bundleFiles.map((f) => [f, readFileSync(join(DIST, f), "utf8")]));

// 1. budgets
for (const [key, limit] of Object.entries(BUDGET)) {
  const size = built[key].bytes;
  const ok = size <= limit;
  if (!ok) over = true;
  console.log(`${ok ? "ok  " : "OVER"} ${built[key].file}: ${(size / KB).toFixed(1)} KB (budget ${limit / KB} KB)`);
}

// 2. old WebViews (Chrome before 91, e.g. Fully Kiosk on a Fire 7) throw on an optional call with spread arguments, `a?.b(...x)`
for (const [file, code] of text) {
  const hit = code.match(/\?\.(?:[\w$]+)?\(\.\.\./);
  if (hit) problem(`OLD-WEBVIEW ${file}: "${hit[0]}" breaks Chrome < 91 – write it as "if (a.b) a.b(...x)"`);
}
// the same WebViews lack newer functions (Object.hasOwn and findLast from Chrome 93/97, the toSorted family from 110) and dvh (108):
// our own sources may not use them, and dvh only inside @supports
const NEWER = /\bObject\.hasOwn\(|\.findLast(?:Index)?\(|\.to(?:Sorted|Reversed|Spliced)\(/;
const sources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [join(dir, e.name)] : []));
for (const file of sources(join(ROOT, "src"))) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const newer = line.match(NEWER);
    const dvh = /\d+dvh\b/.test(line) && !line.includes("@supports") && !lines.slice(Math.max(0, i - 3), i).some((l) => l.includes("@supports"));
    if (newer || dvh) problem(`OLD-WEBVIEW ${file.slice(ROOT.length + 1)}:${i + 1}: ${newer ? `"${newer[0]}" is missing in old WebViews` : "dvh outside @supports (height: 100dvh)"}`);
  });
}

// 3. no placeholder of the build left in a bundle (a loader would throw a ReferenceError at run time)
for (const [file, code] of text) {
  const left = code.match(/__FP3D_[A-Z_]+__/g);
  if (left) problem(`PLACEHOLDER ${file}: ${[...new Set(left)].join(", ")}`);
}

// 4. no address of a third party in the bundles (namespaces of XML/SVG documents are identifiers, not requests)
const URL_RE = /\bhttps?:\/\/[A-Za-z0-9][^\s"'`<>)\]}\\]*/g;
const ALLOWED_URL = [
  /^https?:\/\/www\.w3\.org\//,
  // a reference in a comment inside a GLSL shader of three.js (text in a string, never requested)
  /^https:\/\/jcgt\.org\/published\/0007\/04\/01\/$/,
];
for (const [file, code] of text) {
  for (const url of new Set(code.match(URL_RE) ?? [])) if (!ALLOWED_URL.some((re) => re.test(url))) problem(`ADDRESS ${file}: ${url}`);
}
// the licence files too (they only carry the notices of the libraries; an address there is a comment, listed and not a request)
const legalAddresses = new Set();
for (const b of Object.values(built)) {
  if (!b.legal) continue;
  for (const url of readFileSync(join(DIST, b.legal), "utf8").match(URL_RE) ?? []) legalAddresses.add(url);
}

// 5. no browser API for an own connection or a worker in the bundles
const NETWORK_API = /\bsendBeacon\b|\bXMLHttpRequest\b|\bnew WebSocket\(|\bEventSource\b|\bimportScripts\b|\bnew Worker\(|\bnew SharedWorker\(|navigator\.serviceWorker/;
for (const [file, code] of text) {
  const hit = code.match(NETWORK_API);
  if (hit) problem(`NETWORK-API ${file}: ${hit[0]}`);
}

// 6. nothing of the original name outside the notices (the notices are the only place where it must stay)
const BRAND = new RegExp(["neon" + "plan", "master" + "short", "floor" + "plan[-_ ]?3d", "neon" + " plan"].join("|"), "i");
for (const f of readdirSync(DIST, { recursive: true })) {
  const name = String(f).replace(/\\/g, "/");
  if (statSync(join(DIST, name)).isDirectory()) continue;
  if (/^(NOTICE|LICENSE-[A-Za-z0-9-]+)\.txt$/.test(name)) continue;
  if (BRAND.test(readFileSync(join(DIST, name), "utf8"))) problem(`BRAND ${name}: the original name is left outside the notices`);
}

// 7. licences: the notice of the copied project and the legal comments of lit and three travel with the bundles
const notice = readFileSync(join(DIST, "NOTICE.txt"), "utf8");
if (!notice.includes(`Copyright (c) 2026 ${"Master" + "short"}`)) problem("LICENCE NOTICE.txt: the copyright notice of the copied project is missing");
const legalText = Object.values(built).map((b) => (b.legal ? readFileSync(join(DIST, b.legal), "utf8") : "")).join("\n");
for (const [what, needle] of [["lit (BSD-3-Clause)", "BSD-3-Clause"], ["three (MIT)", "Three.js Authors"]]) {
  if (!legalText.includes(needle)) problem(`LICENCE ${what}: no legal comment found next to the bundles`);
}
const unlisted = [...legalAddresses].filter((u) => !ALLOWED_URL.some((re) => re.test(u)));
if (unlisted.length) console.log(`note: addresses in the legal comments (text only, never requested): ${unlisted.join(" ")}`);

// 8. manifest: every file named in it is there
for (const b of Object.values(manifest.bundles)) if (!existsSync(join(DIST, b.file))) problem(`MANIFEST: ${b.file} is missing`);

const total = bundleFiles.reduce((acc, f) => acc + statSync(join(DIST, f)).size, 0);
console.log(`${over ? "FAILED" : "built"}: ${bundleFiles.length} bundles, ${(total / KB).toFixed(1)} KB, main ${built.main.file}, version ${version}`);
if (over) process.exit(1);
