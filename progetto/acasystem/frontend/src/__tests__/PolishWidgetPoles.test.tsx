import type { ComponentType } from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetProps } from '@/@types/launcher';
import { CoverWidget } from '@/components/widgets/controls/cover/CoverWidget';
import { FanWidget } from '@/components/widgets/controls/fan/FanWidget';
import { LightWidget } from '@/components/widgets/controls/light/LightWidget';
import { LockWidget } from '@/components/widgets/controls/lock/LockWidget';
import { SensorWidget } from '@/components/widgets/controls/sensor/SensorWidget';
import {
  MAX_FIT_LINES,
  figureFit,
  stateFit,
  textEm,
} from '@/components/widgets/controls/shared/valueFit';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './ControlsHarness';

/*
 * REP-20261007-001, corsia widget, rilievo L-19: nei widget 2×2 il nome resta in alto e la
 * lettura si ancora in basso (due poli), senza una riga inferiore vuota; da sola, la lettura
 * cresce con il widget (cqi) senza tagliarsi. jsdom non applica il CSS: qui si verificano la
 * struttura, le classi e le misure stimate; le regole si leggono dal sorgente e la resa è
 * verificata con Playwright nel resoconto (launcher.html e preview-controls.html).
 */

afterEach(cleanup);

async function readSource(path: string): Promise<string> {
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (file: string, encoding: 'utf8') => string;
  };
  return fs.readFileSync(path, 'utf8');
}

const LARGE: CellSize = { w: 2, h: 2 };
const LONG_STATE = 'Risciacquo e centrifuga finale in corso';

function mount(
  Widget: ComponentType<WidgetProps>,
  id: string,
  entities: HassEntity[],
  settings: CardSettings = {},
  size: CellSize = LARGE
) {
  return renderWithRuntime(
    <Widget id={id} settingsKey={id} settings={settings} size={size} editMode={false} />,
    { entities: fixtureEntities(entities), conn: fakeConnection().conn }
  );
}

const pole = (container: HTMLElement) => container.querySelector('.ctl-pole');
const top = (container: HTMLElement) => container.querySelector('.ctl-row--top');

describe('valueFit: stima della lettura che cresce con il widget', () => {
  it('uno stato breve resta su una riga', () => {
    const fit = stateFit('Inattivo');
    expect(fit.lines).toBe(1);
    expect(fit.fit).toBeGreaterThanOrEqual(textEm('Inattivo'));
    expect(fit.style).toMatchObject({ '--aca-ctl-fit': fit.fit, '--aca-ctl-lines': 1 });
  });

  it('uno stato lungo va a capo (al massimo tre righe) e la riga più lunga resta stretta', () => {
    const one = stateFit(LONG_STATE, 1);
    const fit = stateFit(LONG_STATE);
    expect(fit.lines).toBeGreaterThan(1);
    expect(fit.lines).toBeLessThanOrEqual(MAX_FIT_LINES);
    expect(fit.fit).toBeLessThan(one.fit);
    // Nessuna parola viene spezzata: la riga è larga almeno quanto la parola più lunga.
    expect(fit.fit).toBeGreaterThanOrEqual(textEm('centrifuga'));
  });

  it('cifre: una riga, unità a metà dimensione, glifo in più se richiesto', () => {
    const plain = figureFit('21,4');
    const withUnit = figureFit('21,4', '°C');
    expect(plain.lines).toBe(1);
    expect(withUnit.fit).toBeGreaterThan(plain.fit);
    expect(withUnit.fit).toBeLessThan(figureFit('21,4 °C').fit);
    expect(stateFit('Non disponibile', 1, 1.3).fit).toBeGreaterThan(
      stateFit('Non disponibile', 1).fit
    );
    expect(stateFit('Non disponibile', 1, 1.3).lines).toBe(1);
  });
});

describe('SensorWidget 2×2: due poli', () => {
  const backup = fixtureEntity('sensor.backup', 'idle', {
    friendly_name: 'Backup Backup Manager state',
  });

  it('stato testuale senza comando: nome in alto, lettura in basso che cresce, niente riga vuota', () => {
    const { container } = mount(SensorWidget, 'entity_card_1', [backup], {
      entityId: 'sensor.backup',
    });
    expect(top(container)).toHaveTextContent('Backup Backup Manager state');
    const reading = screen.getByText('Inattivo');
    expect(pole(container)).toContainElement(reading);
    expect(reading).toHaveClass('ctl-state', 'ctl-fit', 'ctl-clamp-1');
    expect(reading.style.getPropertyValue('--aca-ctl-fit')).not.toBe('');
    expect(container.querySelector('.ctl-row--bottom')).toBeNull();
  });

  it('stato testuale lungo: tutto il testo, su più righe', () => {
    const { container } = mount(
      SensorWidget,
      'entity_card_2',
      [fixtureEntity('sensor.lavatrice', LONG_STATE, { friendly_name: 'Lavatrice' })],
      { entityId: 'sensor.lavatrice' }
    );
    const reading = screen.getByText(LONG_STATE);
    expect(pole(container)).toContainElement(reading);
    const lines = stateFit(LONG_STATE).lines;
    expect(reading).toHaveClass('ctl-fit', `ctl-clamp-${lines}`);
    expect(reading.style.getPropertyValue('--aca-ctl-lines')).toBe(String(lines));
  });

  it('valore numerico senza grafico: cifra in basso, adattata con la sua unità', () => {
    const { container } = mount(
      SensorWidget,
      'entity_card_3',
      [
        fixtureEntity('sensor.consumo', '1840', {
          friendly_name: 'Consumo',
          unit_of_measurement: 'W',
        }),
      ],
      { entityId: 'sensor.consumo', showGraph: false }
    );
    const figure = container.querySelector('.ctl-figure');
    expect(figure).not.toBeNull();
    expect(pole(container)).toContainElement(figure as HTMLElement);
    expect(figure).toHaveClass('ctl-fit', 'ctl-fit--figure');
  });

  it('con la linea dell’andamento il valore resta sotto il nome (la linea riempie il fondo)', () => {
    const { container } = mount(
      SensorWidget,
      'entity_card_4',
      [
        fixtureEntity('sensor.temperatura', '21.5', {
          friendly_name: 'Temperatura',
          unit_of_measurement: '°C',
          device_class: 'temperature',
        }),
      ],
      { entityId: 'sensor.temperatura' }
    );
    expect(pole(container)).toBeNull();
    expect(container.querySelector('.ctl-figure')).not.toHaveClass('ctl-fit');
    expect(container.querySelector('.ctl-row--bottom')).toBeNull();
  });

  it('con un comando la lettura sta sopra il comando, alla dimensione abituale', () => {
    const { container } = mount(
      SensorWidget,
      'entity_card_5',
      [fixtureEntity('switch.presa', 'on', { friendly_name: 'Presa' })],
      { entityId: 'switch.presa' }
    );
    const area = pole(container);
    expect(area).toContainElement(screen.getByRole('switch', { name: 'Presa' }));
    const reading = area?.querySelector('.ctl-state');
    expect(reading).toHaveTextContent('Acceso');
    expect(reading).not.toHaveClass('ctl-fit');
    expect(reading?.nextElementSibling).toHaveClass('ctl-row--bottom');
  });

  it('le altre dimensioni non cambiano', () => {
    for (const size of [
      { w: 1, h: 1 },
      { w: 2, h: 1 },
      { w: 1, h: 2 },
    ]) {
      const { container, unmount } = mount(
        SensorWidget,
        'entity_card_1',
        [backup],
        { entityId: 'sensor.backup' },
        size
      );
      expect(pole(container)).toBeNull();
      expect(container.querySelector('.ctl-fit')).toBeNull();
      unmount();
    }
  });
});

describe('Coerenza degli altri widget 2×2: lettura e comando in basso', () => {
  it('luce senza luminosità: lo stato è la lettura in basso, una sola volta', () => {
    const { container } = mount(LightWidget, 'light.ingresso', [
      fixtureEntity('light.ingresso', 'on', {
        friendly_name: 'Ingresso',
        supported_color_modes: ['onoff'],
      }),
    ]);
    const reading = screen.getByText('Acceso');
    expect(pole(container)).toContainElement(reading);
    expect(reading).toHaveClass('ctl-fit');
    expect(screen.getAllByText('Acceso')).toHaveLength(1);
    expect(top(container)).toHaveTextContent('Ingresso');
  });

  it('luce non disponibile: avviso con il glifo, su una riga, in basso', () => {
    const { container } = mount(LightWidget, 'light.giardino', [
      fixtureEntity('light.giardino', 'unavailable', { friendly_name: 'Giardino' }),
    ]);
    const reading = screen.getByText('Non disponibile');
    expect(pole(container)).toContainElement(reading);
    expect(reading.closest('.ctl-fit')).toHaveClass('ctl-clamp-1');
    expect(reading.closest('.ctl-unavailable')?.querySelector('svg, .aca-icon')).not.toBeNull();
    expect(screen.getAllByText('Non disponibile')).toHaveLength(1);
  });

  it('luce dimmerabile: percentuale e cursore insieme in basso', () => {
    const { container } = mount(LightWidget, 'light.cucina', [
      fixtureEntity('light.cucina', 'on', {
        friendly_name: 'Cucina',
        supported_color_modes: ['brightness'],
        brightness: 128,
      }),
    ]);
    const area = pole(container);
    expect(area).toContainElement(screen.getByRole('slider', { name: 'Luminosità di Cucina' }));
    expect(area?.querySelector('.ctl-figure')).not.toBeNull();
    expect(area?.querySelector('.ctl-fit')).toBeNull();
    expect(screen.getByText('Acceso')).toBeInTheDocument();
  });

  it('ventilatore: senza velocità lo stato cresce, con la velocità resta sopra il cursore', () => {
    const bagno = mount(FanWidget, 'fan.bagno', [
      fixtureEntity('fan.bagno', 'off', { friendly_name: 'Bagno', supported_features: 48 }),
    ]);
    expect(pole(bagno.container)?.querySelector('.ctl-figure')).toHaveClass('ctl-fit');
    bagno.unmount();
    const soffitto = mount(FanWidget, 'fan.soffitto', [
      fixtureEntity('fan.soffitto', 'on', {
        friendly_name: 'Soffitto',
        supported_features: 63,
        percentage: 40,
      }),
    ]);
    const area = pole(soffitto.container);
    expect(area).toContainElement(screen.getByRole('slider'));
    expect(area?.querySelector('.ctl-figure')).not.toHaveClass('ctl-fit');
  });

  it('serratura: stato sopra i comandi, in basso', () => {
    const { container } = mount(LockWidget, 'lock.ingresso', [
      fixtureEntity('lock.ingresso', 'locked', { friendly_name: 'Porta', supported_features: 1 }),
    ]);
    const area = pole(container);
    expect(area?.querySelector('.ctl-state')).not.toBeNull();
    expect(area?.querySelector('.ctl-row--bottom button')).not.toBeNull();
  });

  it('tapparella: posizione, cursore e comandi in basso; 2×1 invariato', () => {
    const entity = fixtureEntity('cover.salotto', 'open', {
      friendly_name: 'Salotto',
      supported_features: 15,
      current_position: 65,
    });
    const large = mount(CoverWidget, 'cover_card_1', [entity], { coverId: 'cover.salotto' });
    const area = pole(large.container);
    expect(area).toContainElement(screen.getByRole('slider'));
    expect(area).toContainElement(screen.getByRole('button', { name: 'Chiudi Salotto' }));
    large.unmount();
    const wide = mount(
      CoverWidget,
      'cover_card_1',
      [entity],
      { coverId: 'cover.salotto' },
      { w: 2, h: 1 }
    );
    expect(pole(wide.container)).toBeNull();
  });
});

describe('controls.css: regole dei due poli', () => {
  it('il polo si ancora in basso, la riga vuota sparisce, la lettura cresce con cqi e cqh', async () => {
    const css = await readSource('src/components/widgets/controls/controls.css');
    expect(css).toMatch(/\.ctl-row--bottom:empty\s*\{\s*display:\s*none;/);
    expect(css).toMatch(/\.ctl-pole\s*\{[^}]*margin-top:\s*auto;/);
    const fit = css.match(/\.ctl-pole > \.ctl-fit\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(fit).toMatch(/100cqi\s*\/\s*var\(--aca-ctl-fit/);
    expect(fit).toMatch(/cqh/);
    expect(fit).toMatch(/clamp\(\s*var\(--aca-step-0\)/);
    expect(css).toMatch(
      /\.ctl-pole > \.ctl-fit--figure\s*\{\s*--aca-ctl-fit-max:\s*var\(--aca-step-6\)/
    );
  });
});
