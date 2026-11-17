import assert from 'node:assert/strict';
import { readdir, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const ui = resolve(root, 'ui');
const design = resolve(root, 'design');
const inside = (directory, file) => file === directory || file.startsWith(directory + sep);
const sources = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sources(file));
    else if (/\.tsx?$/.test(file)) result.push(file);
  }
  return result;
};

test('la UI non dipende dalla webapp o dai servizi della casa, inclusi gli import di tipi', async () => {
  for (const file of await sources(ui)) {
    const source = await readFile(file, 'utf8');
    const specifiers = [
      ...source.matchAll(/^\s*(?:import|export)\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*\s*(?:as\s+\w+)?|[\w$]+(?:\s*,\s*\{[^}]*\})?)\s+from\s*)?['"]([^'"]+)['"]/gm),
      ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]/g),
    ];
    for (const [, specifier] of specifiers) {
      const label = `${relative(root, file)} → ${specifier}`;
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(file), specifier);
        assert.ok(inside(ui, target) || (inside(design, target) && target.endsWith('.css')), label);
      } else {
        // BugLinear ships only through this public subpath in the pinned mx-icons package.
        assert.match(specifier, /^(react(?:-dom)?(?:\/.*)?|mx-icons(?:\/components\/bug)?)$/, label);
      }
    }
  }
});

test('UI e frontend risolvono una sola copia di React e ReactDOM', async () => {
  const fromUi = createRequire(new URL('./index.ts', import.meta.url));
  const fromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
  for (const dependency of ['react', 'react-dom', 'react/jsx-runtime']) {
    assert.equal(await realpath(fromUi.resolve(dependency)), await realpath(fromFrontend.resolve(dependency)));
  }
});

test('gli entrypoint pubblici si compilano senza sorgenti o alias del frontend', async () => {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['ui/index.ts', 'ui/motion.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    external: ['react', 'react/*', 'react-dom', 'react-dom/*', 'mx-icons'],
    loader: { '.woff2': 'file' },
    outdir: '.tmp/ui-contract',
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    const file = resolve(root, input);
    assert.ok(inside(ui, file) || inside(design, file), `Dipendenza estranea: ${input}`);
  }
});
