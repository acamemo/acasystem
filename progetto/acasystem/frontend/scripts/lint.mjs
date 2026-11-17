import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Una sola base per frontend e UI: ESLint non esclude i sorgenti condivisi come file esterni.
const cli = fileURLToPath(new URL('./bin/eslint.js', import.meta.resolve('eslint/package.json')));
const config = fileURLToPath(new URL('../eslint.config.js', import.meta.url));
const args = process.argv.slice(2).map((arg) => {
  const normalized = arg.replaceAll('\\', '/');
  if (/^(?:\.\/)?src(?:\/|$)/.test(normalized)) {
    return `frontend/${normalized.replace(/^\.\//, '')}`;
  }
  if (/^\.\.\/ui(?:\/|$)/.test(normalized)) return normalized.slice(3);
  return arg;
});
// Come nel precedente `eslint src`, le opzioni e i percorsi aggiunti non sostituiscono i target base.
const result = spawnSync(
  process.execPath,
  [cli, '--config', config, 'frontend/src', 'ui', ...args],
  { cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'inherit', windowsHide: true }
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
