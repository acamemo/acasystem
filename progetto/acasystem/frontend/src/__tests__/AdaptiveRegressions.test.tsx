import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntity } from '@/utils/fixtures/runtime';
import { haEntityToCapabilities, resolveHaService } from '@/utils/haEntityToCapabilities';

beforeEach(() => {
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(type: string, id: string, state: string, attributes = {}) {
  const callService = vi.fn().mockResolvedValue(undefined);
  const runtime = createFixtureRuntime({
    conn: {} as never,
    services: { light: { turn_on: {}, turn_off: {} }, lock: { lock: {}, unlock: {}, open: {} } },
    entities: { [id]: fixtureEntity(id, state, attributes) },
    callService,
  });
  const tree = (value = runtime) => (
    <WidgetRuntimeProvider value={value}>
      <AdaptiveCategoryWidget type={type} entityId={id} size={{ w: 2, h: 2 }} editMode={false} />
    </WidgetRuntimeProvider>
  );
  return { ...render(tree()), tree, runtime, callService };
}

describe('Audit indipendente del 2026-10-15 — comportamento atteso', () => {
  it('invia un solo comando per una regolazione da tastiera', () => {
    const { callService } = mount('light', 'light.audit', 'on', {
      brightness: 128,
      supported_color_modes: ['brightness'],
    });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Luminosità della luce' }), {
      key: 'ArrowUp',
    });
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('limita gli invii durante dieci movimenti rapidi alla stessa finestra di 180 ms', () => {
    vi.useFakeTimers();
    const { callService } = mount('light', 'light.audit', 'on', {
      brightness: 128,
      supported_color_modes: ['brightness'],
    });
    const slider = screen.getByRole('slider', { name: 'Luminosità della luce' });
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientY: 200 });
    for (let i = 0; i < 10; i++) {
      fireEvent.pointerMove(slider, { pointerId: 1, clientY: 190 - i });
    }
    expect(callService.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('recepisce lo stato HA dopo un comando ottimistico', () => {
    const { rerender, tree, runtime } = mount('light', 'light.audit', 'on');
    fireEvent.click(screen.getByRole('button', { name: 'Accensione luce' }));
    rerender(
      tree({ ...runtime, entities: { 'light.audit': fixtureEntity('light.audit', 'off') } })
    );
    rerender(tree({ ...runtime, entities: { 'light.audit': fixtureEntity('light.audit', 'on') } }));
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('mostra lo stato indisponibile senza crash quando una entità associata scompare', () => {
    const runtime = createFixtureRuntime();
    expect(() =>
      render(
        <WidgetRuntimeProvider value={runtime}>
          <AdaptiveCategoryWidget
            type="light"
            entityId="light.assente"
            size={{ w: 2, h: 2 }}
            editMode={false}
          />
        </WidgetRuntimeProvider>
      )
    ).not.toThrow();
  });

  it('preserva la conferma prima di inviare lo sblocco della serratura', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const runtime = createFixtureRuntime({
      conn: {} as never,
      services: { lock: { lock: {}, unlock: {}, open: {} } },
      entities: {
        'lock.audit': fixtureEntity('lock.audit', 'locked', { code_format: '^\\d{4}$' }),
      },
      callService,
    });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AdaptiveCategoryWidget
          type="lock"
          entityId="lock.audit"
          size={{ w: 1, h: 1 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Serratura' }));
    expect(callService).not.toHaveBeenCalled();
  });

  it('usa il servizio HA volume_set', () => {
    expect(resolveHaService('media_player.audit', 'volume', 45)).toEqual({
      domain: 'media_player',
      service: 'volume_set',
      data: { entity_id: 'media_player.audit', volume_level: 0.45 },
    });
  });

  it('risolve il comando per il controllo umidità esposto dal profilo clima', () => {
    const entity = fixtureEntity('climate.audit', 'heat', { supported_features: 4, humidity: 55 });
    expect(haEntityToCapabilities(entity).capabilities.some((cap) => cap.id === 'humidity')).toBe(
      true
    );
    expect(resolveHaService(entity.entity_id, 'humidity', 60)).toEqual({
      domain: 'climate',
      service: 'set_humidity',
      data: { entity_id: entity.entity_id, humidity: 60 },
    });
  });

  it('non espone il posizionamento per una cover che pubblica solo la posizione e supporta solo open/close', () => {
    const entity = fixtureEntity('cover.audit', 'open', {
      supported_features: 3,
      current_position: 50,
    });
    expect(haEntityToCapabilities(entity).capabilities.some((cap) => cap.id === 'position')).toBe(
      false
    );
  });
});
