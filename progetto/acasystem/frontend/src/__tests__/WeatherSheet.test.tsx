import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { WidgetSettingsSheet } from '@/templates/sheets/WidgetSettingsSheet';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { applyWeatherBinding } from '@/utils/launcher/weatherBinding';
import { emptyWidgetMemory, type WidgetState } from '@/utils/launcher/deviceMemory';
import type { Configuration } from '../../../contracts/collaboration';
import { configurationLayout } from '../../../contracts/profileResources';
import { flush } from './ControlsHarness';

const state = vi.hoisted(() => ({
  pages: {} as Record<string, unknown>,
  live: null as Record<string, unknown> | null,
}));
vi.mock('@/hooks/context', () => ({ usePages: () => state.pages }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => state.live,
}));
beforeEach(() => {
  state.live = null;
  localStorage.removeItem('tunet_widget_memory');
});
afterEach(async () => {
  await flush();
  cleanup();
  state.live = null;
});
const entities = fixtureEntities([
  fixtureEntity('weather.home', 'sunny', {
    friendly_name: 'Meteo casa',
    temperature: 20,
    temperature_unit: '°C',
  }),
  fixtureEntity('weather.new', 'cloudy', {
    friendly_name: 'Nuova fonte',
    temperature: 18,
    temperature_unit: '°C',
  }),
  fixtureEntity('sensor.temperature', '17', {
    friendly_name: 'Temperatura giardino',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
]);
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function sheet(type: 'raw' | 'weather' | 'cover_weather' = 'weather') {
  const id = type === 'cover_weather' ? 'cover_weather_a' : 'weather_temp_a';
  const settings: CardSettings = {
    ...(type === 'raw' ? {} : { categoryWidgetType: type }),
    weatherId: 'weather.home',
    appearanceOpacity: 60,
    graphHistoryHours: 24,
  };
  const cards = { [`home::${id}`]: settings };
  const before: Configuration = {
    snapshot: {
      layout: {
        cardSettings: cards,
        pagesConfig: { pages: ['home'], header: [], home: [id] },
        customNames: {},
        customIcons: {},
        widgetMemory: emptyWidgetMemory(),
      },
    },
  };
  let configuration = before;
  let snapshot = {
    profile: { id: 'profile-one' },
    offline: false,
    editor: {
      id: 'editor-one',
      target: { kind: 'widget', widgetId: id, pageId: 'home' },
      working: before,
      base: { configuration: before },
      quotaBlocked: false,
      conflict: null,
      pendingOperation: null,
      busy: false,
    },
  };
  const save = vi.fn(async () => true),
    begin = vi.fn(async () => undefined),
    finish = vi.fn(async () => true);
  const mutate = vi.fn(async (apply: (value: Configuration) => Configuration) => {
    configuration = apply(configuration);
    snapshot = { ...snapshot, editor: { ...snapshot.editor, working: configuration } };
  });
  state.live = {
    state: snapshot,
    coordinator: { snapshot: () => snapshot, begin, finish, save },
    mutate,
  };
  state.pages = {
    cardSettings: cards,
    pagesConfig: { pages: ['home'], header: [], home: [id] },
    customIcons: {},
    customNames: {},
    pageSettings: {},
  };
  const ui = render(
    <WidgetRuntimeProvider
      value={createFixtureRuntime({
        entities,
        entitiesLoaded: true,
        cardSettings: cards,
        customNames: {},
        saveCardSetting: vi.fn(),
      })}
    >
      <WidgetSettingsSheet
        open
        onClose={() => undefined}
        widgetId={id}
        settingsKey={`home::${id}`}
        pageId="home"
      />
    </WidgetRuntimeProvider>
  );
  return {
    ...ui,
    id,
    before,
    save,
    mutate,
    configuration: () => configuration,
    owner: (key: 'profile' | 'editor') => {
      snapshot =
        key === 'profile'
          ? { ...snapshot, profile: { id: 'other' } }
          : { ...snapshot, editor: { ...snapshot.editor, id: 'other' } };
    },
    offline: () => {
      snapshot = { ...snapshot, offline: true };
    },
  };
}
async function selectSource() {
  fireEvent.click(await screen.findByRole('button', { name: /^Fonte meteo:/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Nuova fonte$/ }));
}

describe('Meteo: ACK nella scheda reale', () => {
  it.each(['raw', 'weather', 'cover_weather'] as const)(
    '%s: un unico form, patch mirata e ACK della centrale',
    async (type) => {
      const ui = sheet(type);
      await selectSource();
      await waitFor(() => expect(ui.save).toHaveBeenCalledExactlyOnceWith({ keepOpen: true }));
      expect(ui.mutate).toHaveBeenCalledOnce();
      expect(screen.getAllByRole('button', { name: /^Fonte meteo:/ })).toHaveLength(1);
      expect(configurationLayout(ui.configuration()).cardSettings).toMatchObject({
        [`home::${ui.id}`]: {
          weatherId: 'weather.new',
          graphHistoryHours: 24,
          appearanceOpacity: 60,
        },
      });
    }
  );
  it('mutate da sola non conclude: il form rimane bloccato fino all’ACK', async () => {
    const ui = sheet(),
      ack = deferred<boolean>();
    ui.save.mockImplementation(() => ack.promise);
    await selectSource();
    await waitFor(() => expect(ui.save).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: /^Temperatura locale:/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Fonte meteo:/ }));
    expect(ui.mutate).toHaveBeenCalledOnce();
    ack.resolve(true);
    await flush();
    expect(screen.getByRole('button', { name: /^Temperatura locale:/ })).not.toBeDisabled();
  });
  it.each(['false', 'rejected'] as const)(
    'ACK %s mantiene la bozza e non ritenta automaticamente',
    async (result) => {
      const ui = sheet();
      if (result === 'false') ui.save.mockResolvedValue(false);
      else ui.save.mockRejectedValue(new Error('SECRET'));
      await selectSource();
      expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
      expect(ui.save).toHaveBeenCalledOnce();
      expect(ui.mutate).toHaveBeenCalledOnce();
      expect(configurationLayout(ui.configuration()).cardSettings).toMatchObject({
        [`home::${ui.id}`]: { weatherId: 'weather.new' },
      });
      expect(document.body).not.toHaveTextContent('SECRET');
    }
  );
  it('permesso negato non applica la patch o richiede il save', async () => {
    const ui = sheet();
    ui.mutate.mockRejectedValue(Object.assign(new Error('Negato'), { status: 423 }));
    await selectSource();
    expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(ui.save).not.toHaveBeenCalled();
    expect(ui.configuration()).toBe(ui.before);
  });
  it.each(['profile', 'editor'] as const)(
    'cambio %s durante mutate blocca il save sul nuovo contesto',
    async (key) => {
      const ui = sheet(),
        pending = deferred<void>();
      ui.mutate.mockImplementation(() => pending.promise);
      await selectSource();
      await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
      ui.owner(key);
      pending.resolve();
      await flush();
      expect(ui.save).not.toHaveBeenCalled();
    }
  );
  it('offline conserva la bozza senza confermare la centrale', async () => {
    const ui = sheet(),
      original = ui.mutate.getMockImplementation()!;
    ui.mutate.mockImplementation(async (apply) => {
      await original(apply);
      ui.offline();
    });
    await selectSource();
    expect(await screen.findByRole('alert')).toHaveTextContent('La bozza è conservata');
    expect(ui.save).not.toHaveBeenCalled();
  });
});

describe('Meteo: identità e memoria conservate', () => {
  function current(): WidgetState {
    return {
      layout: null,
      pagesConfig: { pages: ['home'], header: [], home: ['weather_temp_a', 'cover_weather_a'] },
      cardSettings: {
        'home::weather_temp_a': {},
        'home::cover_weather_a': { categoryWidgetType: 'cover_weather' },
        'other::weather_temp_b': { weatherId: 'weather.home', subtitle: 'Altro widget' },
      },
      customNames: {},
      customIcons: {},
      memory: emptyWidgetMemory(),
    };
  }
  it('scegliere una fonte conserva nome, icona e configurazione ricordata nello stesso risultato', () => {
    const state = current();
    state.memory.entries['weather|weather.home'] = {
      type: 'weather',
      deviceKey: 'weather.home',
      updatedAt: 100,
      label: 'Meteo salvato',
      name: 'Meteo salvato',
      icon: 'cloud',
      settings: { graphHistoryHours: 24, tempId: 'sensor.temperature' },
    };
    const next = applyWeatherBinding(
      state,
      'home::weather_temp_a',
      { weatherId: 'weather.home' },
      500
    );
    expect(next.cardSettings['home::weather_temp_a']).toMatchObject({
      weatherId: 'weather.home',
      graphHistoryHours: 24,
      tempId: 'sensor.temperature',
    });
    expect(next.customNames.weather_temp_a).toBe('Meteo salvato');
    expect(next.customIcons.weather_temp_a).toBe('cloud');
    expect(next.memory.touched.weather_temp_a).toBe(500);
    expect(state.cardSettings['home::weather_temp_a']).toEqual({});
  });
  it('cambiare fonte non cambia quelle degli altri widget', () => {
    const state = current(),
      next = applyWeatherBinding(state, 'home::weather_temp_a', { weatherId: 'weather.new' }, 500);
    expect(next.cardSettings['other::weather_temp_b']?.weatherId).toBe('weather.home');
  });
  it('override della casa conserva la propria identità e non adotta i widget Meteo scelti', () => {
    const state = current(),
      next = applyWeatherBinding(
        state,
        'home::cover_weather_a',
        { weatherId: 'weather.home', tempId: 'sensor.temperature' },
        500
      );
    expect(next.cardSettings['home::cover_weather_a']).toEqual({
      categoryWidgetType: 'cover_weather',
      weatherId: 'weather.home',
      tempId: 'sensor.temperature',
    });
    expect(next.cardSettings['home::cover_weather_a']?.subtitle).toBeUndefined();
    const restored = applyWeatherBinding(next, 'home::cover_weather_a', { weatherId: null }, 600);
    expect(restored.cardSettings['home::cover_weather_a']?.tempId).toBe('sensor.temperature');
    expect(restored.cardSettings['other::weather_temp_b']).toEqual(
      state.cardSettings['other::weather_temp_b']
    );
  });
});
