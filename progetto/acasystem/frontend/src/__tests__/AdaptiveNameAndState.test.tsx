import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adaptiveStateWord } from '@/components/widgets/adaptive/adaptiveState';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '@/templates/launcher/AdaptiveCategoryWidget';
import { adaptiveFixtureServices } from '@/utils/fixtures/adaptiveData';
import { createFixtureRuntime, fixtureEntity } from '@/utils/fixtures/runtime';

const runtimeWith = (
  entities: Record<string, ReturnType<typeof fixtureEntity>>,
  customNames: Record<string, string> = {}
) =>
  createFixtureRuntime({
    conn: {} as never,
    services: adaptiveFixtureServices,
    entities,
    customNames,
  });

const light = (state: string) =>
  fixtureEntity('light.salotto', state, {
    friendly_name: 'Luce soggiorno',
    brightness: 128,
    supported_color_modes: ['brightness'],
  });

const tree = (runtime: ReturnType<typeof runtimeWith>, size: { w: number; h: number }) => (
  <WidgetRuntimeProvider value={runtime}>
    <AdaptiveCategoryWidget type="light" entityId="light.salotto" size={size} editMode={false} />
  </WidgetRuntimeProvider>
);

describe('Nome e stato a parole sulle schede adattive', () => {
  it('sopra la scheda più piccola il nome è la prima riga, con lo stato sotto', () => {
    render(tree(runtimeWith({ 'light.salotto': light('on') }), { w: 2, h: 2 }));
    const name = screen.getByRole('heading', { name: 'Luce soggiorno' });
    expect(name).toHaveClass('aca-adaptive-widget__name');
    const header = name.closest('.aca-adaptive-widget__header') as HTMLElement;
    expect(header.parentElement?.firstElementChild).toBe(header);
    expect(within(header).getByText('Accesa')).toBeInTheDocument();
  });

  it('il nome scelto dalla persona vince su quello del dispositivo', () => {
    const runtime = runtimeWith(
      { 'light.salotto': light('on') },
      { 'light.salotto': 'Lampada del divano' }
    );
    render(tree(runtime, { w: 2, h: 2 }));
    expect(screen.getByRole('heading', { name: 'Lampada del divano' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Luce soggiorno' })).toBeNull();
  });

  it('lo stato cambia con il dispositivo e non ripete la luminosità', () => {
    const view = render(tree(runtimeWith({ 'light.salotto': light('on') }), { w: 2, h: 2 }));
    expect(screen.getByText('Accesa')).toBeInTheDocument();
    expect(screen.queryByText('Spenta')).toBeNull();
    view.rerender(tree(runtimeWith({ 'light.salotto': light('off') }), { w: 2, h: 2 }));
    expect(screen.getByText('Spenta')).toBeInTheDocument();
    expect(screen.queryByText('Accesa')).toBeNull();
  });

  it('alla scheda più piccola il nome sta nei comandi e lo stato prende il posto dell’etichetta', () => {
    render(tree(runtimeWith({ 'light.salotto': light('on') }), { w: 1, h: 1 }));
    expect(screen.queryByRole('heading')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Accensione luce: Luce soggiorno' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Accesa')).toBeInTheDocument();
    expect(document.querySelector('article')).toHaveAttribute('aria-label', 'Luce soggiorno');
  });

  it('un dispositivo non raggiungibile resta con il suo nome e lo dice a parole', () => {
    render(tree(runtimeWith({ 'light.salotto': light('unavailable') }), { w: 2, h: 2 }));
    expect(screen.getByRole('heading', { name: 'Luce soggiorno' })).toBeInTheDocument();
    expect(screen.getByText('Non raggiungibile')).toBeInTheDocument();
  });
});

describe('adaptiveStateWord', () => {
  const entity = (state: string, attributes: Record<string, unknown> = {}) =>
    fixtureEntity('x.y', state, attributes);
  const none = new Set<string>();

  it('luce, ventilatore e clima: acceso o spento', () => {
    expect(adaptiveStateWord('light', entity('on'), none)).toBe('Accesa');
    expect(adaptiveStateWord('light', entity('off'), none)).toBe('Spenta');
    expect(adaptiveStateWord('fan', entity('on'), none)).toBe('Acceso');
    expect(adaptiveStateWord('fan', entity('off'), none)).toBe('Spento');
    expect(adaptiveStateWord('climate', entity('heat'), none)).toBe('Acceso');
    expect(adaptiveStateWord('climate', entity('off'), none)).toBe('Spento');
  });

  it('tapparella: la percentuale solo se la scheda non la mostra già', () => {
    const open = entity('open', { current_position: 60 });
    expect(adaptiveStateWord('cover', open, none)).toBe('Aperta 60%');
    expect(adaptiveStateWord('cover', open, new Set(['position']))).toBe('Aperta');
    expect(adaptiveStateWord('cover', entity('closed', { current_position: 0 }), none)).toBe(
      'Chiusa'
    );
    expect(adaptiveStateWord('cover', entity('opening'), none)).toBe('In apertura');
  });

  it('lettori, aspirapolvere e tosaerba', () => {
    expect(adaptiveStateWord('androidtv', entity('playing'), none)).toBe('In riproduzione');
    expect(adaptiveStateWord('media', entity('paused'), none)).toBe('In pausa');
    expect(adaptiveStateWord('media', entity('off'), none)).toBe('Spento');
    expect(adaptiveStateWord('vacuum', entity('paused'), none)).toBe('In pausa');
    expect(adaptiveStateWord('vacuum', entity('docked', { battery_level: 78 }), none)).toBe(
      'In carica'
    );
    expect(adaptiveStateWord('mower', entity('docked', { battery_level: 100 }), none)).toBe(
      'Alla base'
    );
    expect(adaptiveStateWord('mower', entity('mowing'), none)).toBe('Sta tagliando');
  });

  it('serratura, allarme e sensori dicono già lo stato altrove: nessuna parola in più', () => {
    expect(adaptiveStateWord('lock', entity('locked'), none)).toBeNull();
    expect(adaptiveStateWord('alarm', entity('disarmed'), none)).toBeNull();
    expect(adaptiveStateWord('sensor', entity('21'), none)).toBeNull();
  });
});
