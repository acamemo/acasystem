import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import {
  WeatherBindingSection,
  weatherBindingCandidates,
  type SaveWeatherBinding,
} from '@/templates/sheets/WeatherBindingSection';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const owner = vi.hoisted(() => ({ profile: 'one', editor: 'one' }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => ({
    coordinator: {
      snapshot: () => ({ profile: { id: owner.profile }, editor: { id: owner.editor } }),
    },
  }),
}));
const entities = fixtureEntities([
  fixtureEntity('weather.home', 'sunny', { friendly_name: 'Meteo casa' }),
  fixtureEntity('weather.other', 'unavailable', { friendly_name: 'Meteo seconda casa' }),
  fixtureEntity('sensor.temperature', '18', {
    friendly_name: 'Temperatura giardino',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.offline', 'unavailable', {
    friendly_name: 'Termometro offline',
    device_class: 'temperature',
    unit_of_measurement: '°F',
  }),
  fixtureEntity('sensor.old', '20', {
    friendly_name: 'Termometro senza classe',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.wrong', '20', {
    friendly_name: 'Temperatura nel nome ma potenza',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  fixtureEntity('input_number.temp', '20', {
    friendly_name: 'Impostazione temperatura',
    unit_of_measurement: '°C',
  }),
]);
const runtime = () => ({ entities, entitiesLoaded: true, conn: fakeConnection().conn });
async function choose(label: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
  const list = await screen.findByRole('group', { name: `Scegli: ${label}` });
  fireEvent.click(within(list).getByRole('button', { name }));
}
function pending() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  owner.profile = 'one';
  owner.editor = 'one';
});
afterEach(async () => {
  await flush();
  cleanup();
});

describe('Meteo: associazione esplicita comune', () => {
  it('seleziona solo fonti weather e veri sensori di temperatura, includendo metadati offline', () => {
    expect(weatherBindingCandidates(entities, 'weatherId')).toEqual([
      'weather.home',
      'weather.other',
    ]);
    expect(weatherBindingCandidates(entities, 'tempId')).toEqual([
      'sensor.temperature',
      'sensor.offline',
      'sensor.old',
    ]);
  });
  it.each([false, true])(
    'mount e apertura dei selettori non salvano o comandano (casa=%s)',
    async (home) => {
      const save = vi.fn<SaveWeatherBinding>(async () => undefined),
        callService = serviceMock();
      renderWithRuntime(<WeatherBindingSection settings={{}} saveBinding={save} home={home} />, {
        ...runtime(),
        callService,
      });
      fireEvent.click(screen.getByRole('button', { name: /^Fonte meteo:/ }));
      await flush();
      expect(save).not.toHaveBeenCalled();
      expect(callService).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: home ? 'Automatica della casa' : 'Non collegata' })
      ).toBeInTheDocument();
    }
  );
  it.each(['weather', 'cover_weather'])(
    'il percorso categoria %s usa lo stesso form e una sola patch',
    async (type) => {
      const save = vi.fn<SaveWeatherBinding>(async () => undefined);
      renderWithRuntime(
        <CategoryBindingSection
          settings={{ categoryWidgetType: type }}
          save={vi.fn()}
          saveBinding={save}
        />,
        runtime()
      );
      await choose('Fonte meteo', 'Meteo casa');
      expect(save).toHaveBeenCalledExactlyOnceWith({ weatherId: 'weather.home' });
    }
  );
  it('la temperatura è indipendente e non modifica la fonte meteo', async () => {
    const save = vi.fn<SaveWeatherBinding>(async () => undefined);
    renderWithRuntime(
      <WeatherBindingSection settings={{ weatherId: 'weather.home' }} saveBinding={save} />,
      runtime()
    );
    await choose('Temperatura locale', 'Temperatura giardino');
    expect(save).toHaveBeenCalledExactlyOnceWith({ tempId: 'sensor.temperature' });
  });
  it('scelta automatica cancella solo override esplicito di Meteo di casa', async () => {
    const save = vi.fn<SaveWeatherBinding>(async () => undefined);
    renderWithRuntime(
      <WeatherBindingSection
        settings={{ weatherId: 'weather.other', tempId: 'sensor.temperature' }}
        saveBinding={save}
        home
      />,
      runtime()
    );
    await choose('Fonte meteo', 'Automatica della casa');
    expect(save).toHaveBeenCalledExactlyOnceWith({ weatherId: null });
  });
  it.each(['weather.absent', 'sensor.wrong', 42])(
    'riferimento precedente %s conservato e scollegabile',
    async (reference) => {
      const save = vi.fn<SaveWeatherBinding>(async () => undefined),
        settings: CardSettings = { weatherId: reference };
      renderWithRuntime(
        <WeatherBindingSection settings={settings} saveBinding={save} />,
        runtime()
      );
      expect(screen.getByText(/Collegamento precedente non compatibile/)).toBeInTheDocument();
      expect(save).not.toHaveBeenCalled();
      expect(settings.weatherId).toBe(reference);
      await choose('Fonte meteo', 'Non collegata');
      expect(save).toHaveBeenCalledExactlyOnceWith({ weatherId: null });
    }
  );
  it('non consente una nuova selezione incompatibile anche se presente come riferimento storico', async () => {
    const save = vi.fn<SaveWeatherBinding>(async () => undefined);
    renderWithRuntime(
      <WeatherBindingSection settings={{ tempId: 'sensor.wrong' }} saveBinding={save} />,
      runtime()
    );
    await choose('Temperatura locale', 'Temperatura nel nome ma potenza');
    // Selecting the already configured row explicitly clears it; it is not accepted as a new candidate.
    expect(save).toHaveBeenCalledExactlyOnceWith({ tempId: null });
  });
  it('attesa iniziale disabilita le scelte e non sovrappone errore o salvataggio', () => {
    const save = vi.fn<SaveWeatherBinding>(async () => undefined);
    renderWithRuntime(<WeatherBindingSection settings={{}} saveBinding={save} />, {
      ...runtime(),
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Attendo le fonti');
    expect(screen.getByRole('button', { name: /^Fonte meteo:/ })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('doppio invio resta bloccato fino al riscontro, errore senza segreti e retry esplicito', async () => {
    const operation = pending(),
      save = vi.fn<SaveWeatherBinding>(() => operation.promise);
    renderWithRuntime(<WeatherBindingSection settings={{}} saveBinding={save} />, runtime());
    await choose('Fonte meteo', 'Meteo casa');
    expect(screen.getByRole('button', { name: /^Temperatura locale:/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Temperatura locale:/ }));
    expect(save).toHaveBeenCalledOnce();
    await act(async () => operation.reject(new Error('SECRET')));
    expect(await screen.findByRole('alert')).toHaveTextContent('La bozza è conservata');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('SECRET');
    save.mockResolvedValue();
    await choose('Fonte meteo', 'Meteo casa');
    await flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['profile', 'editor'] as const)(
    'risposta tardiva dopo cambio %s non presenta errori nel nuovo contesto',
    async (key) => {
      const operation = pending(),
        save = vi.fn<SaveWeatherBinding>(() => operation.promise);
      renderWithRuntime(<WeatherBindingSection settings={{}} saveBinding={save} />, runtime());
      await choose('Fonte meteo', 'Meteo casa');
      owner[key] = 'other';
      await act(async () => operation.reject(new Error('Old context')));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );
  it('connessione A→B→A invalida la risposta precedente', async () => {
    const operation = pending(),
      save = vi.fn<SaveWeatherBinding>(() => operation.promise),
      initial = runtime();
    const ui = renderWithRuntime(
      <WeatherBindingSection settings={{}} saveBinding={save} />,
      initial
    );
    await choose('Fonte meteo', 'Meteo casa');
    ui.update({ conn: fakeConnection().conn });
    ui.update({ conn: initial.conn });
    await act(async () => operation.reject(new Error('Old connection')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('unmount invalida la risposta precedente', async () => {
    const operation = pending(),
      save = vi.fn<SaveWeatherBinding>(() => operation.promise);
    const ui = renderWithRuntime(
      <WeatherBindingSection settings={{}} saveBinding={save} />,
      runtime()
    );
    await choose('Fonte meteo', 'Meteo casa');
    ui.unmount();
    await act(async () => operation.reject(new Error('Old widget')));
    expect(save).toHaveBeenCalledOnce();
  });
});
