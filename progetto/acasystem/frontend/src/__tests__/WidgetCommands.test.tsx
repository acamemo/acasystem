/**
 * Guard of the widget commands (ADR-0016, G3). In use a tap on a command acts at once and a tap on
 * the rest of the widget opens its details: the body is one opener (`[data-widget-open]`) placed
 * UNDER the commands, never around them. A command is a semantic element (button, link, field,
 * the roles button/switch/slider/checkbox/spinbutton) or an element marked `data-widget-command`.
 * The guard walks every adaptive type of the catalog and the source of every widget.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { ADAPTIVE_WIDGET_TYPES } from '@/components/widgets/adaptive/widgetTypes';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import {
  adaptiveFixtureEntities as entities,
  adaptiveFixtureServices as services,
  adaptiveFixtureSettings as fixtures,
} from '@/utils/fixtures/adaptiveData';

/** What counts as a command: semantic elements, or an element that says so. */
const COMMAND_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="checkbox"]',
  '[role="spinbutton"]',
  '[data-widget-command]',
].join(', ');

/** The sources of every widget, read as text (the strict program has no Node types). */
const widgetSources = import.meta.glob<string>('/src/components/widgets/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
let adaptiveCss = '';
beforeAll(async () => {
  // Vitest empties CSS imports (`?raw` included): the file is read through a typed dynamic import.
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  adaptiveCss = fs.readFileSync('src/components/widgets/adaptive/adaptiveWidget.css', 'utf8');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(type: string, overrides = {}) {
  const source = fixtures[type]!;
  const openDetails = vi.fn();
  const callService = vi.fn().mockResolvedValue(undefined);
  const runtime = createFixtureRuntime({
    entities,
    services,
    conn: { sendMessagePromise: vi.fn().mockResolvedValue({}) } as never,
    callService,
    openDetails,
    ...overrides,
  });
  const view = render(
    <WidgetRuntimeProvider value={runtime}>
      <AdaptiveCategoryWidget
        type={type}
        {...source}
        settingsKey="page::widget"
        id="widget"
        size={{ w: 4, h: 4 }}
        editMode={false}
        openDetails={() => runtime.openDetails('widget')}
      />
    </WidgetRuntimeProvider>
  );
  return { ...view, openDetails, callService };
}

describe('Guardia dei comandi: il corpo è un apritore sotto i comandi', () => {
  it('il catalogo adattivo è tutto coperto dalle fixture della guardia', () => {
    expect(Object.keys(fixtures).sort()).toEqual([...ADAPTIVE_WIDGET_TYPES].sort());
  });

  it.each(Object.keys(fixtures).filter((type) => type !== 'spacer'))(
    '%s: un solo apritore trasparente, senza pallino, che non avvolge alcun comando',
    async (type) => {
      const { container } = mount(type);
      await act(async () => undefined);
      const openers = container.querySelectorAll<HTMLElement>('[data-widget-open]');
      expect(openers).toHaveLength(1);
      const opener = openers[0]!;
      expect(opener.tagName).toBe('BUTTON');
      expect(opener).toHaveAttribute('aria-label', 'Apri dettagli');
      expect(opener).toHaveClass('aca-adaptive-widget__open');
      // The dot is gone: the opener draws nothing, it is the body.
      expect(opener.childElementCount).toBe(0);
      expect(opener.textContent).toBe('');
      // The first thing of the widget, so the commands that follow sit above it.
      expect(opener.parentElement?.firstElementChild).toBe(opener);
      // Never around a command, and no command is the opener's descendant.
      expect(opener.querySelector(COMMAND_SELECTOR)).toBeNull();
      for (const command of container.querySelectorAll<HTMLElement>(COMMAND_SELECTOR)) {
        if (command === opener) continue;
        expect(opener.contains(command)).toBe(false);
        expect(command.closest('[data-widget-open]')).toBeNull();
      }
    }
  );

  it.each(['light', 'climate', 'cover', 'media'])(
    '%s: il tocco sul corpo apre i dettagli, quello su un comando agisce e non li apre',
    async (type) => {
      const body = mount(type);
      await act(async () => undefined);
      fireEvent.click(screen.getByRole('button', { name: 'Apri dettagli' }));
      expect(body.openDetails).toHaveBeenCalledOnce();
      expect(body.callService).not.toHaveBeenCalled();
      body.unmount();

      const command = mount(type);
      await act(async () => undefined);
      const target = Array.from(command.container.querySelectorAll<HTMLElement>('button')).find(
        (button) =>
          !button.hasAttribute('data-widget-open') &&
          !(button as HTMLButtonElement).disabled &&
          button.getAttribute('role') !== 'slider'
      );
      expect(target, `${type}: un comando a pulsante`).toBeTruthy();
      fireEvent.click(target!);
      await act(async () => undefined);
      expect(command.callService).toHaveBeenCalled();
      expect(command.openDetails).not.toHaveBeenCalled();
    }
  );

  it('in modifica l’apritore è spento: nessun dettaglio dal tocco', async () => {
    const source = fixtures.light!;
    const openDetails = vi.fn();
    const runtime = createFixtureRuntime({ entities, services, openDetails });
    const { container } = render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="light"
          {...source}
          settingsKey="page::widget"
          id="widget"
          size={{ w: 4, h: 4 }}
          editMode
          openDetails={() => openDetails()}
        />
      </WidgetRuntimeProvider>
    );
    await act(async () => undefined);
    const opener = container.querySelector<HTMLButtonElement>('[data-widget-open]')!;
    expect(opener).toBeDisabled();
    fireEvent.click(opener);
    expect(openDetails).not.toHaveBeenCalled();
  });
});

describe('Guardia dei comandi: lo stile mette i comandi sopra l’apritore', () => {
  const rules = () =>
    [...adaptiveCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)].map(
      (match) => ({ selector: match[1]!.replace(/\s+/g, ' ').trim(), body: match[2]! })
    );
  const rule = (selector: string) =>
    rules()
      .filter((item) => item.selector === selector)
      .map((item) => item.body)
      .join(' ');

  it('l’apritore copre il widget da sotto, trasparente', () => {
    const body = rule('.aca-adaptive-widget__open');
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/inset:\s*0/);
    expect(body).toMatch(/z-index:\s*0/);
    expect(body).toMatch(/background:\s*transparent/);
  });

  it('il resto del widget sta sopra e lascia passare il tocco, i comandi lo riprendono', () => {
    const content = rule(
      '.aca-adaptive-widget:has(> .aca-adaptive-widget__open) > :not(.aca-adaptive-widget__open)'
    );
    expect(content).toMatch(/z-index:\s*1/);
    expect(content).toMatch(/pointer-events:\s*none/);
    const commands = rules().find(
      (item) =>
        item.selector.includes('[data-widget-command]') && /pointer-events:\s*auto/.test(item.body)
    );
    expect(commands).toBeTruthy();
    // The same list the guard uses: every kind of command is given the touch back.
    for (const part of [
      'button:not([data-widget-open])',
      'a[href]',
      'input',
      'select',
      'textarea',
      "[role='button']",
      "[role='switch']",
      "[role='slider']",
      "[role='checkbox']",
      "[role='spinbutton']",
    ]) {
      expect(commands!.selector, part).toContain(part);
    }
  });
});

/** The opening tags of a source file, with their attributes (braces and strings respected). */
function openingTags(source: string): Array<{ tag: string; text: string; line: number }> {
  const tags: Array<{ tag: string; text: string; line: number }> = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== '<' || !/[a-zA-Z]/.test(source[i + 1] ?? '')) continue;
    const before = source.slice(Math.max(0, i - 1), i);
    if (/[A-Za-z0-9_$)\]]/.test(before)) continue; // a generic or a comparison, not a tag
    let depth = 0;
    let quote = '';
    let j = i + 1;
    for (; j < source.length; j += 1) {
      const char = source[j]!;
      if (quote) {
        if (char === quote && source[j - 1] !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = depth === 0 ? char : '';
      else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0 && source[j - 1] !== '=') break;
    }
    const text = source.slice(i, j + 1);
    const tag = /^<([a-zA-Z][\w.]*)/.exec(text)?.[1] ?? '';
    tags.push({ tag, text, line: source.slice(0, i).split('\n').length });
  }
  return tags;
}

describe('Guardia dei comandi: niente comando senza semantica', () => {
  const NON_SEMANTIC = new Set([
    'div',
    'span',
    'li',
    'p',
    'article',
    'section',
    'label',
    'img',
    'svg',
  ]);
  const TOUCH = /\b(onClick|onPointerDown|onPointerUp|onMouseDown|onTouchStart)=/;

  it('un elemento non semantico con un gestore di tocco è un comando marcato, un ruolo o un cuscinetto', () => {
    const root = '/src/components/widgets';
    const offenders: string[] = [];
    let inspected = 0;
    for (const [file, source] of Object.entries(widgetSources)) {
      // The previews of the design gallery are not widgets of the launcher.
      if (/\/preview\//.test(file)) continue;
      for (const { tag, text, line } of openingTags(source)) {
        inspected += 1;
        if (!NON_SEMANTIC.has(tag) || !TOUCH.test(text)) continue;
        const marked = /data-widget-command|\brole=/.test(text);
        // A wrapper that only stops the click from reaching the widget background is no command.
        const stopper = /onClick=\{stop\}/.test(text);
        if (!marked && !stopper) offenders.push(`${file.replace(root, '')}:${line} ${tag}`);
      }
    }
    expect(inspected).toBeGreaterThan(500);
    expect(offenders).toEqual([]);
  });

  it('il lettore dei tag riconosce un div cliccabile (la guardia non è cieca)', () => {
    const found = openingTags(
      'const a = b < c;\nreturn <div className="x" onClick={() => go(1 > 0)}>ok</div>;'
    );
    expect(found).toHaveLength(1);
    expect(found[0]!.tag).toBe('div');
    expect(TOUCH.test(found[0]!.text)).toBe(true);
    expect(/data-widget-command|\brole=/.test(found[0]!.text)).toBe(false);
  });
});
