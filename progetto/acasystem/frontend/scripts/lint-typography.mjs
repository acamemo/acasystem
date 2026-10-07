import fs from 'node:fs';
import path from 'node:path';

/*
 * Typography rules of ADR-0007: no all-caps or other text-transform, no added letter-spacing,
 * no bold (weights 300/400/500 only). Fails for every file in src; the legacy Tunet UI that was
 * only counted is gone (REP-20261006-001, ISSUE-029).
 */

const root = process.cwd();
const srcDir = path.join(root, 'src');
const extensions = new Set(['.tsx', '.jsx', '.ts', '.js', '.css']);

const POSITIVE_SPACING = /^\+?(?:0*[1-9]\d*(?:\.\d+)?|0*\.\d*[1-9]\d*)(?:[a-z%]+)?$/i;
const isPositive = (value) => {
  const v = value
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .trim();
  if (v.startsWith('-') || /^(normal|inherit|initial|unset|revert)$/i.test(v)) return false;
  return POSITIVE_SPACING.test(v.split(/\s+/)[0]);
};

const isHeavy = (value) => {
  const v = value
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .trim()
    .toLowerCase();
  if (v === 'bold' || v === 'bolder') return true;
  const number = Number.parseInt(v, 10);
  return Number.isFinite(number) && number >= 600;
};

const rules = [
  {
    name: 'maiuscolo (uppercase)',
    test: (line) => /(?<![\w/.-])(?:[\w-]+:)*uppercase(?![\w-])/.test(line),
  },
  {
    name: 'text-transform',
    test: (line) =>
      /text-transform\s*:\s*(?!none\b)[a-z-]+/i.test(line) ||
      /textTransform\s*:\s*['"`](?!none\b)[a-z-]+/i.test(line) ||
      /(?<![\w/.-])(?:[\w-]+:)*(?:lowercase|capitalize)(?![\w(-])/.test(line),
  },
  {
    name: 'tracking-* (spaziatura tra le lettere)',
    test: (line) => /(?<![\w/.-])(?:[\w-]+:)*-?tracking-[\w[\].%-]+/.test(line),
  },
  {
    name: 'letter-spacing positivo',
    test: (line) => {
      for (const match of line.matchAll(/letter-spacing\s*:\s*([^;}]+)/gi))
        if (isPositive(match[1])) return true;
      for (const match of line.matchAll(/letterSpacing\s*:\s*([^,}]+)/g))
        if (isPositive(match[1])) return true;
      return false;
    },
  },
  {
    name: 'grassetto (font-semibold/bold/extrabold/black)',
    test: (line) =>
      /(?<![\w/.-])(?:[\w-]+:)*font-(?:semibold|bold|extrabold|black)(?![\w-])/.test(line),
  },
  {
    name: 'font-weight ≥ 600',
    test: (line) => {
      for (const match of line.matchAll(/font-weight\s*:\s*([^;}]+)/gi))
        if (isHeavy(match[1])) return true;
      for (const match of line.matchAll(/fontWeight\s*:\s*([^,}]+)/g))
        if (isHeavy(match[1])) return true;
      return /(?<![\w-])(?:[\w-]+:)*font-\[(?:[6-9]\d\d)\]/.test(line);
    },
  },
];

/** Blanks out comments, keeping line numbers. Good enough for source and CSS. */
function stripComments(text) {
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
    if (char === '"' || char === "'" || char === '`') {
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
    if (char === '/' && next === '/' && text[i - 1] !== ':') {
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
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      files.push(...walk(full));
    } else if (extensions.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

const toPosix = (file) => path.relative(root, file).split(path.sep).join('/');

const violations = [];
let scanned = 0;

for (const file of fs.existsSync(srcDir) ? walk(srcDir) : []) {
  const relative = toPosix(file);
  const lines = stripComments(fs.readFileSync(file, 'utf8')).split(/\r?\n/);
  scanned += 1;
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (!rule.test(line)) continue;
      violations.push({ file: relative, line: index + 1, rule: rule.name, text: line.trim() });
    }
  });
}

if (violations.length > 0) {
  console.error(
    `Tipografia: ${violations.length} violazioni (ADR-0007: niente maiuscolo, tracking o grassetto).`
  );
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.rule}`);
    console.error(`  ${violation.text}`);
  }
  process.exit(1);
}

console.log(`Tipografia superata: 0 violazioni (${scanned} file analizzati).`);
