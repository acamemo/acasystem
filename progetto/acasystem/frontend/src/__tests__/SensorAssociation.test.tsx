import { useState } from 'react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import {
  SensorBindingSection,
  initialSensorBindingMode,
} from '@/templates/sheets/SensorBindingSection';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { SensorSection } from '@/templates/sheets/sections/SensorSection';
import type { SaveProductBinding } from '@/templates/sheets/ProductBindingSection';
import { resolveSensorDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime } from './ControlsHarness';

const mocked = vi.hoisted(() => ({
  devices: vi.fn(),
  entities: vi.fn(),
  profile: 'profile-one',
  editor: 'editor-one',
}));
vi.mock('@/api/haClient', async (original) => ({
  ...(await original<typeof import('@/api/haClient')>()),
  getDeviceRegistry: mocked.devices,
  getEntityRegistry: mocked.entities,
  getAreas: async () => [],
}));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => ({
    coordinator: {
      snapshot: () => ({ profile: { id: mocked.profile }, editor: { id: mocked.editor } }),
    },
  }),
}));
const devices: HaDeviceRegistryEntry[] = [
  { id: 'sensor-device', name: 'Sensore salotto' },
  { id: 'neighbor', name: 'Sensore cucina' },
];
const registry: HaEntityRegistryEntry[] = [
  { entity_id: 'sensor.temperature', device_id: 'sensor-device', platform: 'mqtt' },
  { entity_id: 'sensor.humidity', device_id: 'sensor-device', platform: 'mqtt' },
  { entity_id: 'binary_sensor.motion', device_id: 'sensor-device', platform: 'mqtt' },
  {
    entity_id: 'sensor.battery',
    device_id: 'sensor-device',
    platform: 'mqtt',
    entity_category: 'diagnostic',
  },
  { entity_id: 'sensor.neighbor', device_id: 'neighbor', platform: 'mqtt' },
];
const entities = fixtureEntities([
  fixtureEntity('sensor.temperature', '21.5', {
    friendly_name: 'Temperatura',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.humidity', '45', {
    friendly_name: 'Umidità',
    device_class: 'humidity',
    unit_of_measurement: '%',
  }),
  fixtureEntity('binary_sensor.motion', 'off', {
    friendly_name: 'Movimento',
    device_class: 'motion',
  }),
  fixtureEntity('sensor.battery', '90', {
    friendly_name: 'Batteria',
    device_class: 'battery',
    unit_of_measurement: '%',
  }),
  fixtureEntity('sensor.neighbor', '22', {
    friendly_name: 'Temperatura cucina',
    device_class: 'temperature',
  }),
  fixtureEntity('input_boolean.mode', 'off', { friendly_name: 'Modalità notte' }),
  fixtureEntity('input_number.threshold', '20', { friendly_name: 'Soglia' }),
  fixtureEntity('input_select.option', 'Uno', {
    friendly_name: 'Opzione',
    options: ['Uno', 'Due'],
  }),
  fixtureEntity('scene.evening', 'scening', { friendly_name: 'Scena sera' }),
  fixtureEntity('script.evening', 'off', { friendly_name: 'Script sera' }),
  fixtureEntity('switch.output', 'off', { friendly_name: 'Uscita' }),
  fixtureEntity('button.refresh', 'unknown', { friendly_name: 'Aggiorna' }),
  fixtureEntity('input_button.refresh', 'unknown', { friendly_name: 'Pulsante helper' }),
  fixtureEntity('media_player.legacy', 'paused', { friendly_name: 'Vecchio lettore' }),
]);
const binding = resolveSensorDeviceBinding('sensor-device', devices, registry, entities)!;
const empty: CardSettings = { categoryWidgetType: 'sensor' };
const physical: CardSettings = {
  ...empty,
  entityId: binding.primaryEntityId,
  productDevice: binding,
  sensorBindingMode: 'device',
};
const legacy: CardSettings = {
  ...empty,
  entityId: 'input_boolean.mode',
  sensorAction: { type: 'toggle', entityId: 'switch.output' },
  showName: false,
  sensorStatusText: 'Pronto',
  adaptiveBindings: { script: 'script.evening' },
};
const runtime = () => ({ entities, entitiesLoaded: true, conn: fakeConnection().conn });
const form = (
  current = empty,
  save: SaveProductBinding = vi.fn<SaveProductBinding>(async () => undefined)
) => <SensorBindingSection settings={current} saveBinding={save} />;
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (value: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function delayRegistry() {
  const dev = deferred<HaDeviceRegistryEntry[]>(),
    ent = deferred<HaEntityRegistryEntry[]>();
  mocked.devices.mockImplementationOnce(() => dev.promise);
  mocked.entities.mockImplementationOnce(() => ent.promise);
  return () => {
    dev.resolve(devices);
    ent.resolve(registry);
  };
}
async function chooseDevice() {
  fireEvent.click(await screen.findByRole('button', { name: /Dispositivo da collegare:/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Sensore salotto/ }));
}
async function chooseHelper(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /Helper o comando:/ }));
  fireEvent.click(await screen.findByRole('button', { name: label }));
}
beforeEach(() => {
  mocked.devices.mockReset().mockResolvedValue(devices);
  mocked.entities.mockReset().mockResolvedValue(registry);
  mocked.profile = 'profile-one';
  mocked.editor = 'editor-one';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Sensori: modalità di associazione distinta', () => {
  it.each([
    [empty, 'device'],
    [legacy, 'helper'],
    [{ ...empty, sensorBindingMode: 'helper' }, 'helper'],
    [{ ...physical, sensorBindingMode: 'helper' }, 'helper'],
    [{ ...empty, entityId: 'sensor.old' }, 'helper'],
  ] as const)('determina l’ingresso senza migrare i dati', (settings, mode) => {
    expect(initialSensorBindingMode(settings)).toBe(mode);
  });
  it('un nuovo widget apre Dispositivo e navigare i tab non scrive', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(empty, save), runtime());
    await flush();
    expect(screen.getByRole('button', { name: 'Dispositivo', pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Helper e comandi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dispositivo' }));
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
  it('passare dal prodotto al tab Helper non scollega né modifica metadati', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(physical, save), runtime());
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Helper e comandi' }));
    expect(screen.getByRole('button', { name: /Helper o comando:/ })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('la modalità helper esplicita non riattiva metadati residui del prodotto', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({ ...physical, sensorBindingMode: 'helper' }, save), runtime());
    await flush();
    expect(screen.getByRole('button', { name: 'Helper e comandi', pressed: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dispositivo da collegare:/ })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('la categoria sensor usa gli stessi tab senza un nuovo tipo globale', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(
      <CategoryBindingSection settings={empty} save={vi.fn()} saveBinding={save} />,
      runtime()
    );
    await flush();
    expect(screen.getByRole('group', { name: 'Tipo di associazione' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('Sensori: selezione del dispositivo', () => {
  it('usa lo stesso risolutore e salva identità/canali/modalità insieme', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(empty, save), runtime());
    await flush();
    await chooseDevice();
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: binding.primaryEntityId,
        bindingEntityId: null,
        productDevice: binding,
        sensorBindingMode: 'device',
      })
    );
    expect(binding.channelEntityIds).not.toContain('sensor.neighbor');
  });
  it('scollega il prodotto con un unico salvataggio, senza passare a helper', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(physical, save), runtime());
    await flush();
    fireEvent.click(await screen.findByRole('button', { name: /Dispositivo da collegare:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Non collegato' }));
    await flush();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: null,
        bindingEntityId: null,
        productDevice: undefined,
        sensorBindingMode: 'device',
      })
    );
  });
  it.each(['profile', 'editor'] as const)(
    'non scrive con risposta dei registri successiva al cambio %s',
    async (field) => {
      const save = vi.fn<SaveProductBinding>(async () => undefined);
      renderWithRuntime(form(empty, save), runtime());
      await flush();
      const release = delayRegistry();
      await chooseDevice();
      mocked[field] = 'changed';
      release();
      await flush();
      expect(save).not.toHaveBeenCalled();
    }
  );
  it('lo smontaggio invalida la risposta dei registri', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined),
      ui = renderWithRuntime(form(empty, save), runtime());
    await flush();
    const release = delayRegistry();
    await chooseDevice();
    ui.unmount();
    release();
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
  it('il cambio connessione invalida i registri del collegamento precedente', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined),
      ui = renderWithRuntime(form(empty, save), runtime());
    await flush();
    const release = delayRegistry();
    await chooseDevice();
    ui.update({ conn: fakeConnection().conn });
    release();
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
  it('un altro widget aperto durante la rilettura non riceve l’associazione tardiva', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    let update!: (settings: CardSettings) => void;
    function Target() {
      const [settings, setSettings] = useState(empty);
      update = setSettings;
      return form(settings, save);
    }
    renderWithRuntime(<Target />, runtime());
    await flush();
    const release = delayRegistry();
    await chooseDevice();
    await act(async () => update({ ...empty, name: 'Altro widget' }));
    release();
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
  it('blocca il cambio tab e il doppio invio fino all’ACK', async () => {
    const pending = deferred<void>(),
      save = vi.fn(async () => pending.promise);
    renderWithRuntime(form(empty, save), runtime());
    await flush();
    await chooseDevice();
    await flush();
    expect(screen.getByRole('button', { name: 'Helper e comandi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Dispositivo da collegare:/ })).toBeDisabled();
    expect(save).toHaveBeenCalledOnce();
    pending.resolve();
    await flush();
    expect(screen.getByRole('button', { name: 'Helper e comandi' })).not.toBeDisabled();
  });
});

describe('Sensori: Helper e comandi compatibili', () => {
  it.each([
    ['Modalità notte', 'input_boolean.mode'],
    ['Soglia', 'input_number.threshold'],
    ['Opzione', 'input_select.option'],
    ['Scena sera', 'scene.evening'],
    ['Script sera', 'script.evening'],
    ['Uscita', 'switch.output'],
    ['Aggiorna', 'button.refresh'],
    ['Pulsante helper', 'input_button.refresh'],
  ])('seleziona %s con un’operazione senza preferenze cancellate', async (label, entityId) => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({ ...legacy, entityId: 'sensor.temperature' }, save), runtime());
    await flush();
    await chooseHelper(label);
    await flush();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({
      entityId,
      productDevice: undefined,
      bindingEntityId: null,
      sensorBindingMode: 'helper',
    });
    const next: CardSettings = { ...legacy, ...save.mock.calls[0]![0] };
    expect(next.sensorAction).toEqual(legacy.sensorAction);
    expect(next.adaptiveBindings).toEqual(legacy.adaptiveBindings);
    expect(next.showName).toBe(false);
  });
  it('conserva la selezione storica anche quando non appartiene ai candidati attuali', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({ ...legacy, entityId: 'media_player.legacy' }, save), runtime());
    await flush();
    expect(
      screen.getByRole('button', { name: 'Helper o comando: Vecchio lettore' })
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    await chooseHelper('Vecchio lettore');
    await flush();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ entityId: null }));
  });
  it('nessuna entità scelta elimina in modo atomico soltanto associazione e metadati prodotto', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(legacy, save), runtime());
    await flush();
    await chooseHelper('Non collegato');
    await flush();
    expect(save).toHaveBeenCalledWith({
      entityId: null,
      productDevice: undefined,
      bindingEntityId: null,
      sensorBindingMode: 'helper',
    });
  });
  it('scegliere un helper dal prodotto abbandona i metadati solo al tocco sulla scelta', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form(physical, save), runtime());
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Helper e comandi' }));
    expect(save).not.toHaveBeenCalled();
    await chooseHelper('Modalità notte');
    await flush();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({
      entityId: 'input_boolean.mode',
      productDevice: undefined,
      bindingEntityId: null,
      sensorBindingMode: 'helper',
    });
  });
  it('durante l’ACK mantiene scelta e tab bloccati, senza riaccodare il comando', async () => {
    const pending = deferred<void>(),
      save = vi.fn(async () => pending.promise);
    renderWithRuntime(form(legacy, save), runtime());
    await flush();
    await chooseHelper('Soglia');
    await flush();
    expect(screen.getByRole('button', { name: 'Dispositivo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Helper o comando:/ })).toBeDisabled();
    expect(save).toHaveBeenCalledOnce();
    pending.resolve();
    await flush();
    expect(screen.getByRole('button', { name: 'Dispositivo' })).not.toBeDisabled();
  });
  it('un errore conserva la configurazione e consente la riprova esplicita', async () => {
    const save = vi.fn(async () => {
      throw new Error('SECRET');
    });
    renderWithRuntime(form(legacy, save), runtime());
    await flush();
    await chooseHelper('Soglia');
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Associazione non riuscita');
    expect(document.body.textContent).not.toContain('SECRET');
    expect(screen.getByRole('button', { name: 'Dispositivo' })).not.toBeDisabled();
  });
  it('una risposta dopo chiusura non avvia altre scritture', async () => {
    const pending = deferred<void>(),
      save = vi.fn(async () => pending.promise),
      ui = renderWithRuntime(form(legacy, save), runtime());
    await flush();
    await chooseHelper('Soglia');
    ui.unmount();
    pending.resolve();
    await flush();
    expect(save).toHaveBeenCalledOnce();
  });
  it.each(['device', 'helper'] as const)(
    'l’aggiornamento della bozza %s non libera il blocco prima dell’ACK',
    async (mode) => {
      const pending = deferred<void>();
      let set!: (value: CardSettings) => void;
      const save: SaveProductBinding = vi.fn(async (patch) => {
        set({ ...(mode === 'device' ? empty : legacy), ...patch });
        await pending.promise;
      });
      function Target() {
        const [current, update] = useState(mode === 'device' ? empty : legacy);
        set = update;
        return form(current, save);
      }
      renderWithRuntime(<Target />, runtime());
      await flush();
      if (mode === 'device') await chooseDevice();
      else await chooseHelper('Soglia');
      await flush();
      expect(
        screen.getByRole('button', { name: mode === 'device' ? 'Helper e comandi' : 'Dispositivo' })
      ).toBeDisabled();
      pending.resolve();
      await flush();
      expect(
        screen.getByRole('button', { name: mode === 'device' ? 'Helper e comandi' : 'Dispositivo' })
      ).not.toBeDisabled();
    }
  );
});

describe('Sensori: impostazioni helper storiche', () => {
  it('può nascondere soltanto il vecchio selettore Entità mantenendo azioni e preferenze', () => {
    renderWithRuntime(
      <SensorSection
        widgetId="entity_card_test"
        settings={legacy}
        entities={entities}
        save={vi.fn()}
        showEntityPicker={false}
      />,
      runtime()
    );
    expect(screen.queryByRole('button', { name: /^Entità:/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Azione' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Riga di stato' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Mostra il nome' })).not.toBeChecked();
  });
  it('il default conserva l’interfaccia originale dei widget raw senza categoria', () => {
    renderWithRuntime(
      <SensorSection
        widgetId="entity_card_test"
        settings={legacy}
        entities={entities}
        save={vi.fn()}
      />,
      runtime()
    );
    expect(screen.getByRole('button', { name: /^Entità:/ })).toBeInTheDocument();
  });
});
