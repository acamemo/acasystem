// Checks that the product files of casa3d carry neither the name/brand of the copied project nor an address
// of a third party, and that nothing opens a connection of its own to the outside (the browser APIs for it, plus
// the calls by address: fetch, import, image and texture loaders, only in the files listed below).
//
//   node tools/controlla-marchio.mjs        (or: npm run marchio)
//
// Scanned: src/, lang/, overrides/, tools/ (except the two files that must name the old brand) and the
// package files. Not scanned on purpose: upstream/ and upstream.sha256 (verbatim copy and its fingerprints),
// NOTICE and LICENSE-* (notices that must be
// kept), PATCHES.md, UPSTREAM.md and tools/rinomina.mjs (the record of the renames), node_modules/.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// the pattern is built from pieces so that this file does not match itself
// (also the format of the original licence keys and the name of the original update channel, whose texts are pruned)
const BRAND = new RegExp(["neon" + "plan", "master" + "short", "floor" + "plan[-_ ]?3d", "neon" + " plan", "\\bN" + "P-X{4}", "\\bH" + "ACS\\b"].join("|"), "i");
const URL_RE = /\bhttps?:\/\/[A-Za-z0-9][^\s"'`<>)\]}\\]*/g;
const ALLOWED_URL = [/^https?:\/\/www\.w3\.org\//];
const NETWORK_API = /\bsendBeacon\b|\bXMLHttpRequest\b|\bnew WebSocket\(|\bEventSource\b|\bimportScripts\b|\bnew Worker\(/;
// Calls that fetch something by address. A call without an argument (`fetch()`, `x.load()`) is a local function,
// not the browser's. Those left in the product are listed here with the reason; a new one anywhere else fails.
const ADDRESS_CALL = /(?<![\w.])fetch\(\s*[^)\s]|\b(?:window|globalThis|self)\.fetch\(|\bimport\(|\.load\(\s*[^)\s]|\bnew Image\(|\bnew (?:Texture|File|Audio|ImageBitmap)Loader\(/;
const ALLOWED_ADDRESS_CALL = new Map([
  ["src/i18n.ts", "language file lang/<code>.json, address built from import.meta.url"],
  ["src/load3d.ts", "bundle of the 3D view, address built from import.meta.url"],
  ["src/load-editor.ts", "bundle of the editor, address built from import.meta.url"],
  ["src/load-fun.ts", "bundle of the extras, address built from import.meta.url"],
  ["src/load-timetravel.ts", "bundle of the time travel, address built from import.meta.url"],
  ["src/load-voice.ts", "bundle of the voice commands, address built from import.meta.url"],
  ["src/viewer/projection.ts", "texture of a picture the user chose (data, see PATCHES.md section 6)"],
  ["src/viewer/viewer3d.ts", "texture of a picture the user chose (data, see PATCHES.md section 6)"],
  ["src/components/editor.ts", "preview of a picture the user chose (data, see PATCHES.md section 6)"],
]);

const SCAN_DIRS = ["src", "lang", "overrides", "tools"];
const SCAN_FILES = ["package.json", "tsconfig.json", ".gitattributes", "build.mjs"];
const SKIP = new Set(["tools/rinomina.mjs"]);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const problems = [];
let scanned = 0;
const files = [...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))), ...SCAN_FILES.map((f) => join(ROOT, f))];
for (const file of files) {
  const name = relative(ROOT, file).split(sep).join("/");
  if (SKIP.has(name)) continue;
  const text = readFileSync(file, "utf8");
  scanned++;
  text.split("\n").forEach((line, i) => {
    const where = `${name}:${i + 1}`;
    if (BRAND.test(line)) problems.push(`${where}: name of the original project: ${line.trim().slice(0, 100)}`);
    for (const url of line.match(URL_RE) ?? []) if (!ALLOWED_URL.some((re) => re.test(url))) problems.push(`${where}: address: ${url}`);
    if (name.startsWith("src/") && !name.endsWith(".test.ts")) {
      if (NETWORK_API.test(line)) problems.push(`${where}: own connection: ${line.trim().slice(0, 100)}`);
      if (ADDRESS_CALL.test(line) && !ALLOWED_ADDRESS_CALL.has(name)) problems.push(`${where}: call by address not in the list: ${line.trim().slice(0, 100)}`);
    }
  });
}

if (problems.length) {
  console.error(`controlla-marchio: ${problems.length} problem(s) in ${scanned} files`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`controlla-marchio: ok (${scanned} files: no original name, no third-party address, no own connection, calls by address only in the listed files)`);
