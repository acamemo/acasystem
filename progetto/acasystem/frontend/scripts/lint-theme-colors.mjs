import fs from 'node:fs';
import path from 'node:path';

/*
 * Colour rule of the Acasystem theme (ADR-0006/0007): outside src/themes the code uses the kit
 * tokens (--aca-*) and primitives, never palette or hex colours. It checks the layered folders
 * and the app entry:
 * - in .ts/.tsx: Tailwind palette colours (text-gray-500, bg-blue-600/20…), arbitrary colour
 *   utilities (bg-[#123456], text-[rgb(…)]) and hex colours in the source;
 * - in .css: hex colours, which belong to the tokens in src/themes/acasystem. Neutral shadow
 *   and light layers written as rgb(… / alpha), as the kit material does, are allowed.
 * The kit test page is skipped: it prints the hex values of the palette as documentation.
 * The legacy Tunet UI replaced by the launcher has been removed (REP-20261006-001, ISSUE-029).
 * Superseded rules: typography has its own lint (lint-typography.mjs).
 */

const root = process.cwd();
const dirs = [
  'src/components/primitives',
  'src/components/system',
  'src/components/widgets',
  'src/templates',
  'src/pages',
  'src/routes',
];
const skipped = ['src/pages/kit'];
const files = ['src/app.tsx', 'src/main.tsx'];

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white';
const UTILITY =
  'text|bg|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder';
const sourceRules = [
  {
    name: 'colore della palette Tailwind',
    pattern: new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:${UTILITY})-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d{1,3})?(?![\\w-])`
    ),
  },
  {
    name: 'colore arbitrario Tailwind',
    pattern: new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:${UTILITY})-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\()`
    ),
  },
  { name: 'colore esadecimale', pattern: /['"`(\s:]#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i },
];
const cssRules = [
  { name: 'colore esadecimale', pattern: /:[^;{}]*#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i },
];

/** Blanks out comments, keeping line numbers. Good enough for source and CSS. */
function stripComments(text, css) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];
    if (quote) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'" || (!css && char === '`')) {
      quote = char;
      out += char;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    if (!css && char === '/' && next === '/' && text[i - 1] !== ':') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') found.push(...walk(full));
    } else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      found.push(full);
    }
  }
  return found;
}

const toPosix = (file) => path.relative(root, file).split(path.sep).join('/');
const isSkipped = (file) => {
  const relative = toPosix(file);
  return skipped.some((dir) => relative === dir || relative.startsWith(`${dir}/`));
};
const targets = [
  ...dirs.flatMap((dir) => walk(path.join(root, dir))),
  ...files.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file)),
].filter((file) => !isSkipped(file));

const violations = [];
for (const file of targets) {
  const css = file.endsWith('.css');
  const lines = stripComments(fs.readFileSync(file, 'utf8'), css).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of css ? cssRules : sourceRules) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: toPosix(file),
          line: index + 1,
          rule: rule.name,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(
    `Colori: ${violations.length} violazioni (usa i token --aca-* e le primitive al posto dei colori letterali).`
  );
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.rule}`);
    console.error(`  ${violation.text}`);
  }
  process.exit(1);
}

console.log(`Colori superati: 0 violazioni (${targets.length} file analizzati).`);
