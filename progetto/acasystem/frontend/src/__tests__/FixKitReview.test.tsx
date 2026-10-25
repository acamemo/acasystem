import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  Button,
  Field,
  Icon,
  Popover,
  Segmented,
  Toggle,
  isIconName,
} from '@/components/primitives';

/**
 * REP-20261006-001, ondata 4, corsia kit: RESP-2, RESP-3, DES-6, PERF-1 (Popover) e l'icona
 * chevronUp chiesta dalla corsia launcher-ui. jsdom non calcola il layout: per le aree di tocco
 * e il foglio si verificano le regole che le garantiscono; le misure con Playwright sono nel
 * resoconto della corsia.
 */
let material = '';
let components = '';

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types (see FixSystemIndicator).
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const read = (file: string) =>
    fs.readFileSync(`src/themes/acasystem/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  material = read('material.css');
  components = read('components.css');
});

afterEach(cleanup);

function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

/** Lengths in em of a margin/padding shorthand, expanded to [top, right, bottom, left]. */
function sides(value: string): number[] {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => Number(part.replace(/em$/, '')));
  const [top = 0, right = top, bottom = top, left = right] = parts;
  return [top, right, bottom, left];
}

describe('RESP-3: area di tocco di 44 px senza cambiare l’aspetto', () => {
  it('ogni pulsante del materiale ha un ::before trasparente che cresce solo sotto i 44 px', () => {
    const target = rule(material, ':where(button.aca-m)::before');
    expect(target).toMatch(/content:\s*''/);
    expect(target).toMatch(/position:\s*absolute/);
    expect(target).toMatch(/inset:\s*min\(0px, calc\(50% - 22px\)\)/);
    // No paint: the target is invisible.
    expect(target).not.toMatch(/background|box-shadow|border:/);
  });

  it('non cambia le dimensioni dei materiali: niente minimi di 44 px su socket o faccia', () => {
    for (const css of [material, components]) {
      expect(css).not.toMatch(/min-(?:width|height|block-size|inline-size):\s*(?:44px|2\.75rem)/);
      expect(css).not.toMatch(/max\(44px/);
    }
  });

  it('copre Toggle, voci del Segmented, pulsanti circolari e Button sm: sono tutti button.aca-m', () => {
    render(
      <>
        <Button variant="control" shape="circle" aria-label="Chiudi">
          ×
        </Button>
        <Button variant="control" size="sm">
          Voce
        </Button>
        <Toggle checked={false} compact aria-label="Interruttore" />
        <Segmented
          label="Periodo"
          size="sm"
          value="oggi"
          onChange={() => {}}
          options={[
            { value: 'oggi', label: 'Oggi' },
            { value: 'mese', label: 'Mese' },
          ]}
        />
      </>
    );
    const targets = [
      ...screen.getAllByRole('button'),
      screen.getByRole('switch', { name: 'Interruttore' }),
    ];
    expect(targets).toHaveLength(5);
    // The switch has its own component since REP-20261007-021, with its own 44 px area.
    for (const target of targets) {
      expect(target.matches('button.aca-m, button.aca-toggle')).toBe(true);
    }
  });
});

describe('RESP-2: tutto il pozzetto del Field agisce come l’input', () => {
  it('un clic sull’icona mette a fuoco l’input', () => {
    render(<Field label="Cerca" icon="search" />);
    const icon = document.querySelector('.aca-field__icon') as Element;
    fireEvent.click(icon);
    expect(screen.getByLabelText('Cerca')).toHaveFocus();
  });

  it('una pressione sul pozzetto di un campo a fuoco non toglie il focus (niente blur a metà)', () => {
    let blurs = 0;
    render(<Field label="Nome" icon="search" onBlur={() => (blurs += 1)} />);
    const input = screen.getByLabelText('Nome');
    const well = document.querySelector('.aca-field') as HTMLElement;
    // Not focused yet: the press goes on as usual, the click then focuses the input.
    expect(fireEvent.mouseDown(well)).toBe(true);
    fireEvent.click(well);
    expect(input).toHaveFocus();
    // Focused: the press on the well is cancelled, so the browser keeps the focus in the input.
    expect(fireEvent.mouseDown(well)).toBe(false);
    expect(fireEvent.mouseDown(document.querySelector('.aca-field__icon') as Element)).toBe(false);
    // A press on the input itself keeps the default (caret, selection).
    expect(fireEvent.mouseDown(input)).toBe(true);
    expect(blurs).toBe(0);
  });
});

describe('DES-6: il corpo scorrevole del foglio non taglia le ombre delle righe', () => {
  it('lascia almeno 1,25em ai lati e 1em sopra e sotto, senza superare gli intervalli verso intestazione e piè di pagina', () => {
    const body = rule(components, '.aca-sheet__body');
    const margin = sides(/(?:^|\s)margin:\s*([^;]+);/.exec(body)?.[1] ?? '0');
    const padding = sides(/(?:^|\s)padding:\s*([^;]+);/.exec(body)?.[1] ?? '0');
    // The content box stays where it was: every negative margin matches its padding.
    expect(margin.map((value) => -value)).toEqual(padding);
    const [top, right, bottom, left] = padding;
    for (const side of [right, left]) expect(side).toBeGreaterThanOrEqual(1.25);
    // Top and bottom stay within the gaps to the header and the footer, so scrolled rows never
    // cover them (a bottom of 1.25em entered the footer by 4 px).
    const gap = Number(
      /gap:\s*([\d.]+)em/.exec(
        rule(components, '.aca-sheet__panel > .aca-m__outer > .aca-m__face > .aca-sheet__content')
      )?.[1] ?? 0
    );
    expect(gap).toBeGreaterThan(0);
    for (const side of [top, bottom]) {
      expect(side).toBeGreaterThanOrEqual(1);
      expect(side).toBeLessThanOrEqual(gap);
    }
  });
});

describe('PERF-1: il contenuto del Popover vive solo da aperto', () => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  afterEach(() => {
    delete proto.showPopover;
    delete proto.hidePopover;
  });

  it('con l’API nativa monta all’apertura, resta durante la dissolvenza e poi si smonta', async () => {
    // jsdom has no popover API: stub it, so the component takes the native path.
    proto.showPopover = () => undefined;
    proto.hidePopover = () => undefined;
    let mounts = 0;
    function Content() {
      mounts += 1;
      return <span>Voce del menu</span>;
    }
    render(
      <Popover label="Menu" trigger={(props) => <Button {...props}>Apri</Button>}>
        <Content />
      </Popover>
    );
    const trigger = screen.getByRole('button', { name: 'Apri' });
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    if (!panel) throw new Error('pannello assente');
    expect(trigger).toHaveAttribute('popovertarget', panel.id);
    expect(mounts).toBe(0);

    const toggle = (type: 'beforetoggle' | 'toggle', newState: 'open' | 'closed') =>
      act(() => {
        panel.dispatchEvent(Object.assign(new Event(type), { newState }));
      });
    toggle('beforetoggle', 'open');
    toggle('toggle', 'open');
    expect(screen.getByText('Voce del menu')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    let finish = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    panel.getAnimations = () => [{ finished } as unknown as Animation];
    toggle('toggle', 'closed');
    // Closed for the browser and for assistive tech, but the fading panel keeps its content.
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Voce del menu')).toBeInTheDocument();
    await act(async () => {
      finish();
      await finished;
    });
    expect(screen.queryByText('Voce del menu')).not.toBeInTheDocument();
  });
});

describe('icona chevronUp (richiesta della corsia launcher-ui)', () => {
  const path = (markup: string) =>
    (/ d="([^"]+)"/.exec(markup)?.[1] ?? '').match(/-?[\d.]+/g)?.map(Number) ?? [];

  it('è un’icona del kit ed è lo speculare verticale di chevronDown', () => {
    expect(isIconName('chevronUp')).toBe(true);
    const down = path(renderToStaticMarkup(<Icon name="chevronDown" />));
    const up = path(renderToStaticMarkup(<Icon name="chevronUp" />));
    expect(up).toHaveLength(down.length);
    expect(down.length).toBeGreaterThan(4);
    up.forEach((value, index) => {
      const mirrored = index % 2 === 0 ? down[index] : 24 - (down[index] ?? 0);
      expect(value).toBeCloseTo(mirrored ?? Number.NaN, 2);
    });
  });
});
