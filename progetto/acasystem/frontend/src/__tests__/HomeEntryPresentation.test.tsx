import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Spinner } from '@/components/primitives';

const css = { components: '', motion: '', white: '' };
beforeAll(async () => {
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  for (const [name, path] of Object.entries({
    components: '../design/themes/acasystem/components.css',
    motion: '../design/themes/glass-white/motion.css',
    white: '../design/themes/glass-white/white.css',
  })) css[name as keyof typeof css] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
});
afterEach(cleanup);

const keyframes = (name: string) =>
  new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)\\s*\\}`).exec(css.components)?.[1] ?? '';

describe('presentazione iniziale Home condivisa', () => {
  it('lascia al presenter l’annuncio quando il loader è decorativo', () => {
    const view = render(<Spinner className="home-progress" />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(view.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(view.container.firstElementChild).toHaveClass('aca-spinner', 'home-progress');
    expect(view.container.querySelector('[aria-valuenow]')).toBeNull();
  });

  it('annuncia un solo stato quando usato autonomamente', () => {
    render(<Spinner label="Caricamento della casa…" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento della casa…');
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-hidden');
  });

  it('lascia raggiungibili i controlli di recupero senza catturare input sul loader', () => {
    expect(css.components).toMatch(/\.aca-home-loader\s*\{[^}]*pointer-events: none/);
    expect(css.components).toMatch(/\.aca-home-loader__recovery\s*\{\s*pointer-events: auto/);
  });

  it('mantiene la preparazione misurabile e separa il fade dal movimento', () => {
    const preparing = /\.aca-home-entry\[data-home-phase='preparing'\]\s*\{([^}]*)\}/.exec(css.components)?.[1] ?? '';
    expect(preparing).toMatch(/opacity:\s*0/);
    expect(preparing).not.toMatch(/display:|visibility:|height:/);
    expect(keyframes('aca-home-in')).toMatch(/opacity:\s*0/);
    expect(keyframes('aca-home-in')).not.toMatch(/transform|scale|filter/);
    expect(keyframes('aca-home-rise')).toMatch(/translateY\(var\(--aca-space-5, 1\.5rem\)\)/);
    expect(keyframes('aca-home-rise')).not.toMatch(/opacity|scale|filter/);
    expect(css.components).toMatch(/\.aca-home-entry\[data-home-phase='entering'\] > \.aca-home-entry__content\s*\{\s*animation: aca-home-rise var\(--aca-dur-sheet-in, 280ms\)/);
  });

  it('riduce il movimento a sola dissolvenza con un indicatore statico', () => {
    expect(css.components).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.aca-spinner__ring\s*\{ animation: none;/);
    expect(css.components).toMatch(/animation: aca-home-in-reduced var\(--aca-dur-reduced, 120ms\) linear both/);
    expect(keyframes('aca-home-in-reduced')).not.toMatch(/transform|scale|filter/);
    expect(css.components).toMatch(/\.aca-home-entry\[data-home-phase='entering'\] > \.aca-home-entry__content\s*\{\s*animation: none;\s*transform: none;/);
  });

  it('sopprime la vecchia intro solo nel route host già gestito', () => {
    expect(css.motion.match(/:root \.aca-app-root\[data-home-managed\]\s*\{\s*animation: none;/g)).toHaveLength(2);
    expect(css.motion).toMatch(/:root \.aca-app-root\s*\{\s*animation: aca-white-app-in/);
    expect(css.motion).toMatch(/:root \.aca-app-root\s*\{\s*animation: aca-white-app-fade/);
  });

  it('mantiene il paesaggio sul gruppo fermo e lo esclude nei fallback opachi', () => {
    const selector = ":root .aca-home-entry:is([data-home-phase='preparing'], [data-home-phase='entering'])";
    expect(css.white.split(selector)).toHaveLength(3);
    const supported = css.white.slice(css.white.indexOf(selector), css.white.indexOf(selector) + 650);
    expect(supported).toMatch(/background-image: linear-gradient\(var\(--aca-white-veil\), var\(--aca-white-veil\)\), var\(--aca-white-photo\)/);
    expect(supported).toMatch(/background-attachment: fixed/);
    expect(supported).not.toMatch(/transform:/);
    const fallback = css.white.slice(css.white.indexOf('@media (prefers-reduced-transparency: reduce)'));
    expect(fallback).toContain(selector);
    expect(fallback.slice(fallback.indexOf(selector), fallback.indexOf(selector) + 650)).toMatch(/background-image: none/);
  });

  it('applica realmente i fallback locali concordati senza una fotografia tardiva', () => {
    expect(css.white).toMatch(/:root\[data-aca-home-font-fallback\]\s*\{\s*--aca-font: system-ui/);
    expect(css.white).toMatch(/:root\[data-aca-home-photo-fallback\]\s*\{\s*--aca-white-photo: none/);
  });
});
