import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { CAR_SOURCE_FIELDS } from '@/domain/car/carSources';
import { CarBindingSection, type SaveCarBinding } from '@/templates/sheets/CarBindingSection';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const owner = vi.hoisted(() => ({ profile: 'profile-one', editor: 'editor-one' }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => ({
    coordinator: {
      snapshot: () => ({ profile: { id: owner.profile }, editor: { id: owner.editor } }),
    },
  }),
}));
const entities = fixtureEntities([
  fixtureEntity('sensor.battery', '74', {
    friendly_name: 'Batteria auto',
    device_class: 'battery',
    unit_of_measurement: '%',
  }),
  fixtureEntity('sensor.range', '310', {
    friendly_name: 'Autonomia auto',
    device_class: 'distance',
    unit_of_measurement: 'km',
  }),
  fixtureEntity('sensor.power', '7.2', {
    friendly_name: 'Potenza auto',
    device_class: 'power',
    unit_of_measurement: 'kW',
  }),
  fixtureEntity('sensor.temperature', '20', {
    friendly_name: 'Temperatura auto',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.battery_offline', 'unavailable', {
    friendly_name: 'Batteria offline',
    device_class: 'battery',
    unit_of_measurement: '%',
  }),
  fixtureEntity('binary_sensor.charging', 'on', {
    friendly_name: 'Ricarica auto',
    device_class: 'battery_charging',
  }),
  fixtureEntity('binary_sensor.plugged', 'off', {
    friendly_name: 'Cavo auto',
    device_class: 'plug',
  }),
  fixtureEntity('device_tracker.car', 'home', {
    friendly_name: 'Posizione auto',
    latitude: 45,
    longitude: 7,
  }),
  fixtureEntity('climate.car', 'off', { friendly_name: 'Clima auto' }),
  fixtureEntity('lock.car', 'locked', { friendly_name: 'Serratura auto' }),
  fixtureEntity('switch.charge', 'off', { friendly_name: 'Ricarica principale' }),
  fixtureEntity('button.charge', 'unknown', { friendly_name: 'Avvia ricarica' }),
  fixtureEntity('script.charge', 'off', { friendly_name: 'Ricarica manuale' }),
  fixtureEntity('number.limit', '80', { friendly_name: 'Limite auto', unit_of_measurement: '%' }),
  fixtureEntity('select.limit', '80%', { friendly_name: 'Opzioni auto', options: ['80%', '90%'] }),
  fixtureEntity('sensor.home_temperature', '21', {
    friendly_name: 'Batteria nel nome ma temperatura',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
]);
const settings: CardSettings = {
  categoryWidgetType: 'car',
  batteryId: 'sensor.battery',
  rangeId: 'sensor.range',
  chargingId: 'binary_sensor.charging',
  imageUrl: '/local/car.png',
  name: 'La mia auto',
  adaptiveControls: { visible: ['range'], order: ['range', 'battery'] },
};
const runtime = () => ({ entities, entitiesLoaded: true, conn: fakeConnection().conn });
const form = (current: CardSettings, save: SaveCarBinding) => (
  <CarBindingSection settings={current} saveBinding={save} />
);
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function openSection(label: string) {
  const section =
    label === 'Aggiungi comando di ricarica'
      ? 'Comandi di ricarica aggiuntivi'
      : CAR_SOURCE_FIELDS.find((field) => field.label === label)?.section;
  if (section && section !== 'Batteria e viaggio') {
    const trigger = screen.getByRole('button', { name: new RegExp(`^${section}(?: \\(|$)`) });
    if (trigger.getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger);
  }
}
async function choose(label: string, name: string) {
  await openSection(label);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
  const picker = await screen.findByRole('group', { name: `Scegli: ${label}` });
  fireEvent.click(within(picker).getByRole('button', { name }));
}
beforeEach(() => {
  owner.profile = 'profile-one';
  owner.editor = 'editor-one';
});
afterEach(async () => {
  await flush();
  cleanup();
});

describe('Auto: fonti manuali condivise e compatibilità', () => {
  it('le sezioni secondarie si aprono senza salvare e mostrano le fonti già configurate', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form(settings, save), runtime());
    const charging = screen.getByRole('button', { name: 'Ricarica (1)' });
    expect(charging).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(charging);
    expect(charging).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(charging);
    expect(charging).toHaveAttribute('aria-expanded', 'false');
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
  it('espone tutti i ruoli esistenti senza applicare suggerimenti, scritture o comandi', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined),
      callService = serviceMock();
    renderWithRuntime(form({}, save), { ...runtime(), callService });
    await flush();
    expect(
      screen.getByText('Alcuni collegamenti si applicano anche agli altri widget di questa auto.')
    ).toBeInTheDocument();
    for (const field of CAR_SOURCE_FIELDS)
      expect(
        screen.getByRole('button', { name: `${field.label}: Non collegato` })
      ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Indirizzo immagine' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('il ramo categoria usa un solo selettore batteria e nessuna rimozione integrazione HA', () => {
    renderWithRuntime(
      <CategoryBindingSection settings={settings} save={vi.fn()} saveBinding={vi.fn()} />,
      runtime()
    );
    expect(screen.getAllByRole('button', { name: 'Batteria: Batteria auto' })).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: /Sensore batteria dell’auto|Rimuovi dispositivo/ })
    ).toBeNull();
  });
  it.each([
    ['Autonomia', 'Autonomia auto', 'rangeId', 'sensor.range'],
    ['Potenza di ricarica', 'Potenza auto', 'chargingPowerId', 'sensor.power'],
    ['Temperatura interna', 'Temperatura auto', 'tempId', 'sensor.temperature'],
    ['Posizione', 'Posizione auto', 'locationId', 'device_tracker.car'],
    ['Clima', 'Clima auto', 'climateId', 'climate.car'],
    ['Serratura', 'Serratura auto', 'lockId', 'lock.car'],
    ['Limite di ricarica', 'Limite auto', 'chargeLimitNumberId', 'number.limit'],
    ['Opzioni di ricarica', 'Opzioni auto', 'chargeLimitSelectId', 'select.limit'],
  ])(
    'associa %s senza richiedere la batteria o riscrivere altre preferenze',
    async (label, name, key, id) => {
      const save = vi.fn<SaveCarBinding>(async () => undefined);
      renderWithRuntime(
        form({ imageUrl: '/local/car.png', adaptiveControls: settings.adaptiveControls }, save),
        runtime()
      );
      await choose(label, name);
      await flush();
      expect(save).toHaveBeenCalledExactlyOnceWith({ [key]: id });
    }
  );
  it('usa classi e unità invece del nome per la selezione della batteria', async () => {
    renderWithRuntime(form({}, vi.fn()), runtime());
    fireEvent.click(screen.getByRole('button', { name: 'Batteria: Non collegato' }));
    const picker = await screen.findByRole('group', { name: 'Scegli: Batteria' });
    expect(
      within(picker).queryByRole('button', { name: 'Batteria nel nome ma temperatura' })
    ).toBeNull();
  });
  it('conserva una sorgente indisponibile ma compatibile fra le scelte', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria offline');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ batteryId: 'sensor.battery_offline' });
  });
  it.each([undefined, 'binary_sensor.plugged'])(
    'mostra l’alias effettivo e salva entrambi insieme (%s)',
    async (old) => {
      const save = vi.fn<SaveCarBinding>(async () => undefined);
      renderWithRuntime(
        form({ chargingId: 'binary_sensor.plugged', chargingStateId: old }, save),
        runtime()
      );
      await choose('Stato della ricarica', 'Ricarica auto');
      await flush();
      expect(save).toHaveBeenCalledExactlyOnceWith({
        chargingStateId: 'binary_sensor.charging',
        chargingId: 'binary_sensor.charging',
      });
    }
  );
  it('scollega i due alias insieme senza modificare le altre fonti', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(
      form(
        { chargingStateId: 'binary_sensor.charging', chargingId: 'binary_sensor.plugged' },
        save
      ),
      runtime()
    );
    await choose('Stato della ricarica', 'Non collegato');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ chargingStateId: null, chargingId: null });
  });
  it.each(['sensor.missing', 'sensor.home_temperature'])(
    'il riferimento storico %s resta visibile e scollegabile',
    async (id) => {
      const save = vi.fn<SaveCarBinding>(async () => undefined);
      renderWithRuntime(form({ batteryId: id }, save), runtime());
      expect(screen.getByText(/Collegamento precedente non compatibile/)).toBeInTheDocument();
      expect(save).not.toHaveBeenCalled();
      await choose('Batteria', 'Non collegato');
      await flush();
      expect(save).toHaveBeenCalledExactlyOnceWith({ batteryId: null });
    }
  );
  it('aggiunta/rimozione array non elimina il controllo singolo o altre fonti', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(
      form({ chargeControlId: 'switch.charge', chargeControlIds: ['script.charge'] }, save),
      runtime()
    );
    await choose('Aggiungi comando di ricarica', 'Avvia ricarica');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({
      chargeControlIds: ['script.charge', 'button.charge'],
    });
    save.mockClear();
    await openSection('Aggiungi comando di ricarica');
    fireEvent.click(screen.getByRole('button', { name: 'Scollega Ricarica manuale' }));
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ chargeControlIds: [] });
  });
  it('mantiene recuperabili array non compatibili senza normalizzarli al montaggio', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form({ chargeControlIds: ['switch.missing', 5] }, save), runtime());
    await openSection('Aggiungi comando di ricarica');
    expect(screen.getByRole('button', { name: 'Scollega elenco' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Scollega elenco' }));
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ chargeControlIds: [] });
  });
  it('l’immagine non viene caricata o salvata digitando; Salva usa lo stesso ACK', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form({}, save), runtime());
    fireEvent.click(screen.getByRole('button', { name: /^Immagine dell’auto/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Indirizzo immagine' }), {
      target: { value: '/local/auto.png' },
    });
    expect(document.querySelector('img,iframe')).toBeNull();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salva immagine' }));
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ imageUrl: '/local/auto.png' });
  });
  it('rifiuta uno schema immagine non sicuro senza cancellare il valore storico', async () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form({ imageUrl: 'javascript:old' }, save), runtime());
    expect(screen.getByRole('textbox', { name: 'Indirizzo immagine' })).toHaveValue(
      'javascript:old'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salva immagine' }));
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Indirizzo immagine non compatibile');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Scollega immagine' }));
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ imageUrl: null });
  });
});

describe('Auto: ACK e protezione delle risposte tardive', () => {
  it('blocca tutti i campi durante l’ACK e rifiuta un secondo invio', async () => {
    const pending = deferred(),
      save = vi.fn<SaveCarBinding>(() => pending.promise);
    renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria auto');
    await flush();
    const other = screen.getByRole('button', { name: 'Autonomia: Non collegato' });
    expect(other).toBeDisabled();
    other.click();
    expect(screen.queryByRole('group', { name: 'Scegli: Autonomia' })).toBeNull();
    fireEvent.click(other);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Scegli: Autonomia' })).getByRole('button', {
        name: 'Autonomia auto',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salva immagine' }));
    expect(save).toHaveBeenCalledOnce();
    pending.resolve();
    await flush();
    expect(other).not.toBeDisabled();
  });
  it('gli aggiornamenti ottimistici mantengono il blocco fino al riscontro', async () => {
    const pending = deferred();
    function Target() {
      const [current, setCurrent] = useState<CardSettings>({});
      return form(current, async (patch) => {
        setCurrent((old) => ({ ...old, ...patch }));
        await pending.promise;
      });
    }
    renderWithRuntime(<Target />, runtime());
    await choose('Batteria', 'Batteria auto');
    await flush();
    expect(screen.getByRole('button', { name: 'Autonomia: Non collegato' })).toBeDisabled();
    pending.resolve();
    await flush();
    expect(screen.getByRole('button', { name: 'Autonomia: Non collegato' })).not.toBeDisabled();
  });
  it('una risposta persa non causa retry automatici o messaggi sensibili', async () => {
    const save = vi
      .fn<SaveCarBinding>()
      .mockRejectedValueOnce(new Error('SECRET'))
      .mockResolvedValue(undefined);
    renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria auto');
    await flush();
    expect(save).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(document.body).not.toHaveTextContent('SECRET');
    await choose('Batteria', 'Batteria auto');
    await flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each(['profile', 'editor'] as const)('il cambio %s invalida l’errore tardivo', async (key) => {
    const pending = deferred(),
      save = vi.fn<SaveCarBinding>(() => pending.promise);
    renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria auto');
    owner[key] = 'other';
    pending.reject(new Error('SECRET'));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
  it('smontare il form non genera scritture o errori tardivi', async () => {
    const pending = deferred(),
      save = vi.fn<SaveCarBinding>(() => pending.promise);
    const ui = renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria auto');
    ui.unmount();
    pending.reject(new Error('SECRET'));
    await flush();
    expect(save).toHaveBeenCalledOnce();
  });
  it('un cambio connessione invalida la risposta precedente', async () => {
    const pending = deferred(),
      save = vi.fn<SaveCarBinding>(() => pending.promise);
    const ui = renderWithRuntime(form({}, save), runtime());
    await choose('Batteria', 'Batteria auto');
    ui.update({ conn: fakeConnection().conn });
    pending.reject(new Error('SECRET'));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
  it('cambiare target durante l’ACK non applica errori al nuovo widget', async () => {
    const pending = deferred(),
      save = vi.fn<SaveCarBinding>(() => pending.promise);
    let change!: (value: CardSettings) => void;
    function Target() {
      const [current, update] = useState<CardSettings>({});
      change = update;
      return form(current, save);
    }
    renderWithRuntime(<Target />, runtime());
    await choose('Batteria', 'Batteria auto');
    await act(async () => change({ name: 'Altra auto' }));
    pending.reject(new Error('SECRET'));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
  it('durante l’attesa entità non mostra compatibilità errate né salva', () => {
    const save = vi.fn<SaveCarBinding>(async () => undefined);
    renderWithRuntime(form({ batteryId: 'sensor.missing' }, save), {
      ...runtime(),
      entitiesLoaded: false,
      entities: {},
    });
    expect(screen.getByRole('status')).toHaveTextContent('Attendo le fonti');
    expect(screen.queryByText(/precedente non compatibile/)).toBeNull();
    expect(screen.getByRole('button', { name: /^Batteria:/ })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
});
