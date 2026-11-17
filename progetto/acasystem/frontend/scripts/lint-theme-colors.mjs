import fs from 'node:fs';
import path from 'node:path';
import { isSharedUiShim } from './lint-paths.mjs';

/*
 * Colour rule of the Acasystem theme (ADR-0006/0007): outside the shared theme the code uses kit
 * tokens (--aca-*) and primitives, never palette or hex colours. It checks the layered folders
 * and the app entry, shared UI and shared non-theme CSS:
 * - in .ts/.tsx: Tailwind palette colours (text-gray-500, bg-blue-600/20…), arbitrary colour
 *   utilities (bg-[#123456], text-[rgb(…)]) and hex colours in the source;
 * - in .css: hex colours and rgb()/rgba()/hsl()/hsla()/oklch() literals, which belong to the
 *   tokens in ../design/themes/acasystem (the theme itself is not scanned).
 * It also scans src/hooks, src/utils and src/casa3d. src/utils/mockup and src/utils/fixtures are
 * demo data and are skipped. A literal that has to stay (a drag preview, a runtime hue, a neutral
 * shadow) goes in ALLOWED below with the reason; nothing else is exempt.
 * The kit test page is skipped: it prints the hex values of the palette as documentation.
 * The legacy Tunet UI replaced by the launcher has been removed (REP-20261006-001, ISSUE-029).
 * Superseded rules: typography has its own lint (lint-typography.mjs).
 */

const root = process.cwd();
const dirs = [
  '../ui',
  '../design/layout',
  '../design/components',
  'src/components/system',
  'src/components/widgets',
  'src/templates',
  'src/pages',
  'src/routes',
  'src/hooks',
  'src/utils',
  'src/casa3d',
];
const skipped = ['src/pages/kit', 'src/utils/mockup', 'src/utils/fixtures'];

/*
 * Literals that stay, each with its reason. An entry exempts one file from the named rules only;
 * anything else in that file is still flagged. Relative colours derived from a token
 * (oklch(from var(--…) …)) are not literals and are not flagged.
 */
const FUNCTIONAL = 'colore funzionale (rgb, hsl, oklch)';
const ALLOWED = {
  'src/pages/connect/AccountCreationFields.tsx': {
    rules: ['colore esadecimale'],
    why: 'black/white avatar ink maximizes contrast on the arbitrary personal colour chosen by the user; these are functional data, not app palette choices',
  },
  'src/hooks/useSmartTheme.ts': {
    rules: ['colore esadecimale'],
    why: 'legacy sun/weather gradients of the old Tunet theme; the hook is only exercised by its own test and no screen uses it',
  },
  'src/utils/statusGroupPills.ts': {
    rules: ['colore della palette Tailwind', FUNCTIONAL],
    why: 'icon tints and backgrounds of the status pills (text-amber-300, rgba(…, 0.14)) with no matching --aca token; changing them would change the pills',
  },
  'src/utils/dragAndDrop.ts': {
    rules: [FUNCTIONAL],
    why: 'inline styles of the drag preview and drop target while dragging, outside any theme scope',
  },
  '../ui/primitives/components/Modal.tsx': {
    rules: [FUNCTIONAL],
    why: 'neutral veil of the dialog, the same value as the Sheet backdrop in the kit; no veil token exists',
  },
  'src/components/widgets/adaptive/GestureControl.tsx': {
    rules: [FUNCTIONAL],
    why: 'colour of a light computed from its hue at runtime: it is data, not a theme colour',
  },
  'src/components/widgets/controls/light/LightDetails.tsx': {
    rules: [FUNCTIONAL],
    why: 'swatch of a light channel computed from its hue at runtime: it is data, not a theme colour',
  },
  'src/components/system/edit/edit.css': {
    rules: [FUNCTIONAL],
    why: 'white ink and neutral 10% shadow of the edit tooltip; no token for a fixed white or black layer',
  },
  '../design/layout/pageIndicator.css': {
    rules: [FUNCTIONAL],
    why: 'neutral shadow and light layers of the dots, as the kit material writes them; theme tokens would change the look',
  },
  'src/components/system/status-bar/statusBar.css': {
    rules: [FUNCTIONAL],
    why: 'neutral inset shadow, as the kit material writes it',
  },
  '../design/layout/launcher.css': {
    rules: [FUNCTIONAL],
    why: 'neutral drop shadows of the launcher; the oklch(from …) greys are relative colours (not flagged)',
  },
  'src/pages/system/system.css': {
    rules: [FUNCTIONAL],
    why: 'fallbacks inside var(--k2-…, …) and the neutral shadow/border of the wallpaper and accent swatches',
  },
};
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
  { name: FUNCTIONAL, pattern: /['"`]\s*(?:rgba?|hsla?|oklch)\(/i },
];
const cssRules = [
  { name: 'colore esadecimale', pattern: /:[^;{}]*#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i },
  {
    name: FUNCTIONAL,
    pattern: /:[^;{}]*(?<![\w-])(?:rgba?|hsla?|oklch)\((?!\s*from\s+var\()/i,
  },
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
].filter((file) => !isSkipped(file) && !isSharedUiShim(toPosix(file)));

const violations = [];
for (const file of targets) {
  const css = file.endsWith('.css');
  const lines = stripComments(fs.readFileSync(file, 'utf8'), css).split(/\r?\n/);
  lines.forEach((line, index) => {
    const allowed = ALLOWED[toPosix(file)]?.rules ?? [];
    for (const rule of css ? cssRules : sourceRules) {
      if (allowed.includes(rule.name)) continue;
      // A value that opens on this line and goes on the next: oklch(<newline> from var(…) …).
      const text = css && /\($/.test(line) ? `${line} ${(lines[index + 1] ?? '').trim()}` : line;
      if (rule.pattern.test(text)) {
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
