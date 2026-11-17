import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import {
  EnergyBindingSection,
  type EnergyWidgetKind,
} from '@/templates/sheets/EnergyBindingSection';
import { EnergyPreferencesSection } from '@/templates/sheets/EnergyPreferencesSection';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import type { SaveProductBinding } from '@/templates/sheets/ProductBindingSection';
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
  fixtureEntity('sensor.power', '240', {
    friendly_name: 'Potenza studio',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  fixtureEntity('sensor.energy', '15.2', {
    friendly_name: 'Consumo studio',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
  fixtureEntity('sensor.cost_today', '4.30', {
    friendly_name: 'Spesa di oggi',
    device_class: 'monetary',
    unit_of_measurement: 'EUR',
  }),
  fixtureEntity('sensor.cost_month', '71.50', {
    friendly_name: 'Spesa del mese',
    device_class: 'monetary',
    unit_of_measurement: 'EUR',
  }),
  fixtureEntity('sensor.price', '0.25', {
    friendly_name: 'Prezzo orario',
    unit_of_measurement: 'EUR/kWh',
  }),
  fixtureEntity('sensor.nordpool_temperature', '21', {
    friendly_name: 'Temperatura Nordpool',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.power_offline', 'unavailable', {
    friendly_name: 'Potenza offline',
    device_class: 'power',
    unit_of_measurement: 'kW',
  }),
  fixtureEntity('input_number.cost', '3', {
    friendly_name: 'Costo manuale',
    unit_of_measurement: 'EUR',
  }),
]);
const settings: CardSettings = {
  categoryWidgetType: 'cost',
  todayId: 'sensor.cost_today',
  monthId: 'sensor.cost_month',
  consumptionId: 'sensor.energy',
  currency: 'NOK',
  decimals: 3,
  todayLabel: 'Finora',
  monthLabel: 'Questo mese',
  showWithSupport: true,
  adaptiveControls: { visible: ['today'], order: ['today'] },
};
const labels = ['Potenza istantanea', 'Energia misurata', 'Costo di oggi', 'Costo del mese'];
const runtime = () => ({ entities, entitiesLoaded: true, conn: fakeConnection().conn });
const form = (current: CardSettings, save: SaveProductBinding, kind: EnergyWidgetKind = 'cost') => (
  <EnergyBindingSection kind={kind} settings={current} saveBinding={save} />
);
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function choose(label: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
  const picker = await screen.findByRole('group', { name: `Scegli: ${label}` });
  fireEvent.click(within(picker).getByRole('button', { name }));
}
beforeEach(() => {
  owner.profile = 'profile-one';
  owner.editor = 'editor-one';
});
afterEach(cleanup);

describe('Energia: associazione unica e fonti distinte', () => {
  it('monta quattro sorgenti senza scritture o comandi, anche per i vecchi cost_card', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined),
      callService = serviceMock();
    renderWithRuntime(form(settings, save), { ...runtime(), callService });
    await flush();
    for (const label of labels)
      expect(screen.getByRole('button', { name: new RegExp(`^${label}:`) })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Rimuovi|Elimina|Dispositivo da collegare/ })
    ).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('il prezzo ha un’unica sorgente e non mostra campi monetari dei costi', () => {
    renderWithRuntime(form({ nordpoolId: 'sensor.price' }, vi.fn(), 'nordpool'), runtime());
    expect(
      screen.getByRole('button', { name: 'Fonte dei prezzi: Prezzo orario' })
    ).toBeInTheDocument();
    for (const label of labels)
      expect(screen.queryByRole('button', { name: new RegExp(`^${label}:`) })).toBeNull();
  });
  it.each(['cost', 'nordpool'] as const)(
    'il ramo categoria %s usa lo stesso componente senza duplicare il picker',
    (kind) => {
      renderWithRuntime(
        <CategoryBindingSection
          settings={{ categoryWidgetType: kind }}
          save={vi.fn()}
          saveBinding={vi.fn()}
        />,
        runtime()
      );
      expect(screen.queryByRole('button', { name: /Dispositivo da collegare/ })).toBeNull();
      expect(screen.getAllByRole('button', { name: /: Non collegato$/ })).toHaveLength(
        kind === 'cost' ? 4 : 1
      );
    }
  );
  it.each([
    ['Potenza istantanea', 'Potenza studio', 'powerId', 'sensor.power'],
    ['Energia misurata', 'Consumo studio', 'consumptionId', 'sensor.energy'],
    ['Costo di oggi', 'Spesa di oggi', 'todayId', 'sensor.cost_today'],
    ['Costo del mese', 'Spesa del mese', 'monthId', 'sensor.cost_month'],
    ['Fonte dei prezzi', 'Prezzo orario', 'nordpoolId', 'sensor.price'],
  ])(
    'seleziona %s con una sola patch mirata, preservando le altre preferenze',
    async (label, name, key, id) => {
      const save = vi.fn<SaveProductBinding>(async () => undefined),
        callService = serviceMock();
      const initial = { ...settings, [key]: null };
      renderWithRuntime(form(initial, save, key === 'nordpoolId' ? 'nordpool' : 'cost'), {
        ...runtime(),
        callService,
      });
      await choose(label, name);
      await flush();
      expect(save).toHaveBeenCalledExactlyOnceWith({ [key]: id });
      const next: CardSettings = { ...initial, ...save.mock.calls[0]![0] };
      expect(next.currency).toBe('NOK');
      expect(next.decimals).toBe(3);
      expect(next.todayLabel).toBe('Finora');
      expect(next.showWithSupport).toBe(true);
      expect(next.adaptiveControls).toEqual(settings.adaptiveControls);
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('i candidati vengono dalle capacità e non dal nome Nordpool o dalla stanza', async () => {
    renderWithRuntime(form({}, vi.fn(), 'nordpool'), runtime());
    fireEvent.click(screen.getByRole('button', { name: 'Fonte dei prezzi: Non collegato' }));
    const picker = await screen.findByRole('group', { name: 'Scegli: Fonte dei prezzi' });
    expect(within(picker).getByRole('button', { name: 'Prezzo orario' })).toBeInTheDocument();
    expect(within(picker).queryByRole('button', { name: 'Temperatura Nordpool' })).toBeNull();
    expect(within(picker).queryByRole('button', { name: 'Spesa di oggi' })).toBeNull();
  });
  it('una fonte indisponibile ma compatibile resta associabile', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({}, save), runtime());
    await choose('Potenza istantanea', 'Potenza offline');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ powerId: 'sensor.power_offline' });
  });
  it('un helper esplicito con unità monetaria rimane associabile', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({}, save), runtime());
    await choose('Costo di oggi', 'Costo manuale');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ todayId: 'input_number.cost' });
  });
  it.each(['sensor.missing', 'sensor.nordpool_temperature'])(
    'conserva il vecchio riferimento %s e consente solo lo scollegamento esplicito',
    async (id) => {
      const save = vi.fn<SaveProductBinding>(async () => undefined);
      renderWithRuntime(form({ ...settings, powerId: id }, save), runtime());
      expect(screen.getByText(/Collegamento precedente non compatibile/)).toBeInTheDocument();
      expect(save).not.toHaveBeenCalled();
      await choose('Potenza istantanea', 'Non collegato');
      await flush();
      expect(save).toHaveBeenCalledExactlyOnceWith({ powerId: null });
    }
  );
  it('anche un riferimento storico malformato non viene cancellato al mount', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({ ...settings, powerId: ['sensor.power'] }, save), runtime());
    await flush();
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/Collegamento precedente non compatibile/)).toBeInTheDocument();
    await choose('Potenza istantanea', 'Non collegato');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ powerId: null });
  });
  it('lo scollegamento del prezzo modifica soltanto nordpoolId e non rimuove integrazioni HA', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined),
      callService = serviceMock();
    renderWithRuntime(
      form({ nordpoolId: 'sensor.price', showWithSupport: true }, save, 'nordpool'),
      { ...runtime(), callService }
    );
    await choose('Fonte dei prezzi', 'Non collegato');
    await flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ nordpoolId: null });
    expect(callService).not.toHaveBeenCalled();
  });
  it('l’attesa delle entità non mostra errori di compatibilità e impedisce nuove associazioni', async () => {
    const save = vi.fn<SaveProductBinding>(async () => undefined);
    renderWithRuntime(form({ powerId: 'sensor.old' }, save), {
      ...runtime(),
      entities: {},
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Attendo le fonti');
    expect(screen.queryByText(/precedente non compatibile/)).toBeNull();
    expect(screen.getByRole('button', { name: /^Potenza istantanea:/ })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('Energia: ACK, errori e risposte tardive', () => {
  it('blocca tutti i picker durante l’ACK e impedisce il doppio invio', async () => {
    const pending = deferred(),
      save = vi.fn<SaveProductBinding>(() => pending.promise);
    renderWithRuntime(form({}, save), runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    await flush();
    for (const label of labels)
      expect(screen.getByRole('button', { name: new RegExp(`^${label}:`) })).toBeDisabled();
    const otherSource = screen.getByRole('button', { name: /^Energia misurata:/ });
    otherSource.click();
    expect(screen.queryByRole('group', { name: 'Scegli: Energia misurata' })).toBeNull();
    // Synthetic dispatch can bypass a disabled fieldset; the callback still refuses a second write.
    fireEvent.click(otherSource);
    fireEvent.click(within(screen.getByRole('group', { name: 'Scegli: Energia misurata' })).getByRole('button', { name: 'Consumo studio' }));
    expect(save).toHaveBeenCalledOnce();
    pending.resolve();
    await flush();
    expect(screen.getByRole('button', { name: /^Energia misurata:/ })).not.toBeDisabled();
  });
  it('una bozza aggiornata ottimisticamente non libera il blocco prima del riscontro', async () => {
    const pending = deferred();
    let set!: (value: CardSettings) => void;
    const save = vi.fn<SaveProductBinding>(async (patch) => {
      set({ ...settings, ...patch });
      await pending.promise;
    });
    function Target() {
      const [current, update] = useState(settings);
      set = update;
      return form(current, save);
    }
    renderWithRuntime(<Target />, runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    await flush();
    expect(screen.getByRole('button', { name: /^Costo del mese:/ })).toBeDisabled();
    pending.resolve();
    await flush();
    expect(screen.getByRole('button', { name: /^Costo del mese:/ })).not.toBeDisabled();
  });
  it('risposta persa: nessun replay automatico, errore sicuro e retry soltanto esplicito', async () => {
    const save = vi
      .fn<SaveProductBinding>()
      .mockRejectedValueOnce(new Error('SECRET'))
      .mockResolvedValue(undefined);
    renderWithRuntime(form({}, save), runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(document.body).not.toHaveTextContent('SECRET');
    expect(save).toHaveBeenCalledOnce();
    await choose('Potenza istantanea', 'Potenza studio');
    await flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each(['profile', 'editor'] as const)(
    'la risposta rifiutata dopo cambio %s non contamina il nuovo contesto',
    async (field) => {
      const pending = deferred(),
        save = vi.fn<SaveProductBinding>(() => pending.promise);
      renderWithRuntime(form({}, save), runtime());
      await choose('Potenza istantanea', 'Potenza studio');
      owner[field] = 'other';
      pending.reject(new Error('SECRET'));
      await flush();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(save).toHaveBeenCalledOnce();
    }
  );
  it('lo smontaggio durante l’ACK non avvia altre scritture', async () => {
    const pending = deferred(),
      save = vi.fn<SaveProductBinding>(() => pending.promise);
    const ui = renderWithRuntime(form({}, save), runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    ui.unmount();
    pending.reject(new Error('SECRET'));
    await flush();
    expect(save).toHaveBeenCalledOnce();
  });
  it('un cambio connessione nasconde l’errore tardivo dell’associazione precedente', async () => {
    const pending = deferred(),
      save = vi.fn<SaveProductBinding>(() => pending.promise);
    const ui = renderWithRuntime(form({}, save), runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    ui.update({ conn: fakeConnection().conn });
    pending.reject(new Error('SECRET'));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
  it('cambiare widget durante l’ACK non applica l’errore o una seconda patch al nuovo target', async () => {
    const pending = deferred(),
      save = vi.fn<SaveProductBinding>(() => pending.promise);
    let change!: (value: CardSettings) => void;
    function Target() {
      const [current, update] = useState<CardSettings>({});
      change = update;
      return form(current, save);
    }
    renderWithRuntime(<Target />, runtime());
    await choose('Potenza istantanea', 'Potenza studio');
    await act(async () => change({ ...settings, name: 'Altra tessera' }));
    pending.reject(new Error('SECRET'));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
});

describe('Energia: preferenze condivise senza calcoli aggiuntivi', () => {
  it.each(['cost', 'nordpool'] as const)(
    'montare preferenze %s non salva valuta, sostegno o valori di default',
    async (kind) => {
      const save = vi.fn();
      renderWithRuntime(
        <EnergyPreferencesSection kind={kind} settings={settings} save={save} />,
        runtime()
      );
      await flush();
      expect(screen.queryByRole('textbox', { name: /Valuta/ })).toBeNull();
      expect(screen.queryByRole('switch')).toBeNull();
      expect(save).not.toHaveBeenCalled();
    }
  );
  it('decimali invariati non scrivono, mentre una scelta esplicita è limitata a 0–6', () => {
    const save = vi.fn();
    renderWithRuntime(
      <EnergyPreferencesSection kind="cost" settings={settings} save={save} />,
      runtime()
    );
    const field = screen.getByRole('spinbutton', { name: 'Decimali' });
    fireEvent.blur(field);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '9' } });
    fireEvent.blur(field);
    expect(save).toHaveBeenCalledExactlyOnceWith('decimals', 6);
  });
  it('le etichette sono preferenze esplicite e non ricollegano i sensori', () => {
    const save = vi.fn();
    renderWithRuntime(
      <EnergyPreferencesSection kind="cost" settings={settings} save={save} />,
      runtime()
    );
    const field = screen.getByRole('textbox', { name: 'Etichetta del costo di oggi' });
    fireEvent.change(field, { target: { value: '  Spesa odierna  ' } });
    fireEvent.blur(field);
    expect(save).toHaveBeenCalledExactlyOnceWith('todayLabel', 'Spesa odierna');
  });
  it('la preferenza graphStyle storica rimane salvata senza un selettore grafico inerte', () => {
    const save = vi.fn();
    renderWithRuntime(<EnergyPreferencesSection kind="nordpool" settings={{ ...settings, graphStyle: 'bar' }} save={save} />, runtime());
    expect(screen.queryByRole('button', { name: 'Barre' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Linea' })).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});
