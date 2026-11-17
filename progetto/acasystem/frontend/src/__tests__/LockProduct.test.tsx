import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LockWidget } from '@/components/widgets/controls/lock/LockWidget';
import { LockDetails } from '@/components/widgets/controls/lock/LockDetails';
import { ProductLockControls } from '@/components/widgets/home/lock/ProductLockControls';
import { ProductLockConsole } from '@/components/widgets/home/lock/ProductLockDetails';
import {
  lockActionAllowed,
  lockActionSupported,
  lockProductBinding,
  productLockView,
} from '@/components/widgets/home/lock/productLockModel';
import { COMMAND_LABELS } from '@/components/widgets/controls/shared/labels';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'lock',
  deviceId: 'lock-controller',
  primaryEntityId: 'lock.main',
  channelEntityIds: ['lock.main'],
  secondaryEntityIds: ['sensor.battery', 'sensor.firmware'],
  technicalEntityIds: ['sensor.firmware'],
};
const settings = { lockId: 'lock.main', productDevice: binding, name: 'Ingresso' };
const attributes = { friendly_name: 'Porta', supported_features: 1, code_format: null };
const entity = (state = 'locked', patch: Record<string, unknown> = {}) =>
  fixtureEntity('lock.main', state, { ...attributes, ...patch });
const services = { lock: { lock: {}, unlock: {}, open: {} } };
const runtime = (state = 'locked', patch: Record<string, unknown> = {}) => ({
  entities: fixtureEntities([
    entity(state, patch),
    fixtureEntity('sensor.battery', '90', { friendly_name: 'Batteria', unit_of_measurement: '%' }),
    fixtureEntity('sensor.firmware', 'firmware-lungo-2026', { friendly_name: 'Firmware' }),
  ]),
  services,
  conn: fakeConnection().conn,
});
const home = (current = settings, editMode = false) => (
  <LockWidget
    id="lock.widget"
    settingsKey="home::lock"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <LockDetails
    id="lock.widget"
    settingsKey="home::lock"
    settings={current}
    onClose={() => undefined}
  />
);
const controls = (disabled = false, entityId = 'lock.main') => (
  <ProductLockControls entityId={entityId} label="Porta" disabled={disabled} />
);
function ChangeableControls({ change }: { change: string }) {
  const [changed, setChanged] = useState(false);
  return (
    <>
      <button onClick={() => setChanged(true)}>Cambia propriet�</button>
      <ProductLockControls
        entityId={changed && change === 'rebind' ? 'lock.other' : 'lock.main'}
        label="Porta"
        disabled={changed && change === 'edit'}
      />
    </>
  );
}
const ask = (action: 'Sblocca' | 'Apri' | 'Blocca' = 'Sblocca') => {
  fireEvent.click(screen.getByRole('button', { name: `${action} Porta` }));
  return screen.getByRole('dialog', { name: `${action} Porta?` });
};
const confirm = (dialog: HTMLElement, action = 'Sblocca') =>
  fireEvent.click(within(dialog).getByRole('button', { name: action }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Serratura prodotto: contratto e stato osservato HA2026.10.4', () => {
  it('richiede metadati v1 lock e lockId uguale al canale primario', () => {
    expect(lockProductBinding(settings)).toEqual(binding);
    expect(lockProductBinding({ lockId: 'lock.main' })).toBeNull();
    expect(lockProductBinding({ ...settings, lockId: 'lock.other' })).toBeNull();
    expect(
      lockProductBinding({ ...settings, productDevice: { ...binding, family: 'fan' } })
    ).toBeNull();
  });
  it.each(['unknown', 'unavailable', '', 'constructor', 'toString', '__proto__'])(
    'non inventa uno stato per %s',
    (state) => {
      const view = productLockView(entity(state));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
      expect(lockActionAllowed(view, services, 'lock')).toBe(false);
    }
  );
  it.each([
    ['locked', 'Bloccata'],
    ['unlocked', 'Sbloccata'],
    ['open', 'Aperta'],
    ['locking', 'Blocco in corso'],
    ['unlocking', 'Sblocco in corso'],
    ['opening', 'Apertura in corso'],
    ['jammed', 'Inceppata'],
  ])('nomina %s senza dedurre altri stati', (state, label) => {
    expect(productLockView(entity(state)).stateLabel).toBe(label);
  });
  it('lock/unlock non richiedono feature; open richiede OPEN1 e servizio', () => {
    const noFeature = productLockView(entity('locked', { supported_features: 0 }));
    expect(lockActionSupported(noFeature, services, 'lock')).toBe(true);
    expect(lockActionSupported(noFeature, services, 'unlock')).toBe(true);
    expect(lockActionSupported(noFeature, services, 'open')).toBe(false);
    expect(lockActionSupported(productLockView(entity()), { lock: {} }, 'open')).toBe(false);
    expect(lockActionSupported(productLockView(entity()), services, 'open')).toBe(true);
  });
  it('nessun comando durante movimento o formato del codice malformato', () => {
    for (const state of ['locking', 'unlocking', 'opening'])
      expect(lockActionAllowed(productLockView(entity(state)), services, 'open')).toBe(false);
    expect(
      lockActionAllowed(productLockView(entity('locked', { code_format: 42 })), services, 'unlock')
    ).toBe(false);
  });
});

describe('Serratura prodotto: Home e Console', () => {
  it('apertura e mount non impartiscono comandi', () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    expect(screen.getByText('Bloccata')).toBeTruthy();
    expect(callService).not.toHaveBeenCalled();
  });
  it('Home singola offre un solo comando essenziale, senza apertura immediata', () => {
    const callService = serviceMock();
    renderWithRuntime(home(), { ...runtime(), callService });
    expect(screen.getByRole('button', { name: 'Sblocca Ingresso' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apri Ingresso' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca Ingresso' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('Home multicanale mostra riepilogo e nessun comando collettivo', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['lock.main', 'lock.other'] },
    };
    const rt = runtime();
    renderWithRuntime(home(current), {
      ...rt,
      entities: {
        ...rt.entities,
        ...fixtureEntities([fixtureEntity('lock.other', 'unlocked', attributes)]),
      },
    });
    expect(screen.getByText('1 di 2 canali bloccati')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });
  it('canali con lo stesso nome hanno comandi univoci e tecnica distinta', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['lock.main', 'lock.other'] },
    };
    const rt = runtime();
    renderWithRuntime(details(current), {
      ...rt,
      entities: {
        ...rt.entities,
        ...fixtureEntities([fixtureEntity('lock.other', 'unlocked', attributes)]),
      },
    });
    expect(screen.getByRole('group', { name: 'Comandi di Porta (lock.main)' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Comandi di Porta (lock.other)' })).toBeTruthy();
    expect(screen.getByText('Misure')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Tecnica e manutenzione' }).getAttribute('aria-expanded')
    ).toBe('false');
  });
  it('Console riusa le colonne e il contenitore comune', () => {
    const view = renderWithRuntime(
      <ProductLockConsole
        id="lock.widget"
        settingsKey="home::lock"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(
      view.container.querySelector('.widget-console-details .product-lock-details')
    ).toBeTruthy();
  });
  it('senza metadata il dispatch mantiene il renderer storico', () => {
    const view = renderWithRuntime(
      home({ ...settings, productDevice: undefined } as unknown as typeof settings),
      runtime()
    );
    expect(view.container.querySelector('.product-lock')).toBeNull();
  });
});

describe('Serratura prodotto: conferma, segreti transitori e comandi personali', () => {
  it('sblocco richiede conferma; annullare non invia nulla', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    const dialog = ask();
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('due conferme ravvicinate inviano una sola richiesta', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    const dialog = ask(),
      button = within(dialog).getByRole('button', { name: 'Sblocca' });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.main' });
  });
  it('blocca direttamente senza codice; non reinvia mentre pendente', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime('unlocked'), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Blocca Porta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blocca Porta' }));
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('apertura richiede conferma e unlocked NON conferma il target open', () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime(), callService });
    const dialog = ask('Apri');
    expect(callService).not.toHaveBeenCalled();
    confirm(dialog, 'Apri');
    expect(callService).toHaveBeenCalledWith('lock', 'open', { entity_id: 'lock.main' });
    expect(screen.getByText('Richiesto · Aperta')).toBeTruthy();
    view.setEntities([entity('unlocked')]);
    expect(screen.getByText('Richiesto · Aperta')).toBeTruthy();
    view.setEntities([entity('open')]);
    expect(screen.queryByText('Richiesto · Aperta')).toBeNull();
  });
  it('codici regex non numerici restano password, senza troncamento né trim', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('locked', { code_format: '(?i)passphrase' }),
      callService,
    });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Porta') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.inputMode).toBe('text');
    expect(input.hasAttribute('maxlength')).toBe(false);
    expect(within(dialog).getByRole('button', { name: 'Sblocca' })).toBeDisabled();
    const code = '  Parola lunga più di dodici caratteri  ';
    fireEvent.change(input, { target: { value: code } });
    confirm(dialog);
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.main', code });
    expect(input.value).toBe('');
    expect(document.body.textContent).not.toContain(code);
  });
  it('regex vuota non forza un codice ma conserva la conferma dello sblocco', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime('locked', { code_format: '' }), callService });
    const dialog = ask();
    expect(within(dialog).queryByLabelText('Codice di Porta')).toBeNull();
    expect(callService).not.toHaveBeenCalled();
    confirm(dialog);
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.main' });
  });
  it('la stringa none � una regex dichiarata e non un valore None inventato', () => {
    renderWithRuntime(controls(), runtime('locked', { code_format: 'none' }));
    expect(within(ask()).getByLabelText('Codice di Porta')).toBeTruthy();
  });
  it('due invii Enter del codice producono una sola richiesta', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime('locked', { code_format: '^.*$' }), callService });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Porta');
    fireEvent.change(input, { target: { value: 'abc' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
  });
  it('anche Blocca chiede il codice quando dichiarato dalla serratura', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime('unlocked', { code_format: '^.*$' }), callService });
    const dialog = ask('Blocca');
    expect(callService).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Codice di Porta'), {
      target: { value: 'abc' },
    });
    confirm(dialog, 'Blocca');
    expect(callService).toHaveBeenCalledWith('lock', 'lock', {
      entity_id: 'lock.main',
      code: 'abc',
    });
  });
  it('annullare pulisce il campo anche durante l’uscita della Sheet', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime('locked', { code_format: '^.*$' }), callService });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Porta') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'temporaneo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(input.value).toBe('');
    expect(callService).not.toHaveBeenCalled();
  });
  it.each(['offline', 'unavailable', 'edit', 'loading', 'rebind'])(
    'pulisce il codice e non invia dopo %s',
    (reason) => {
      const callService = serviceMock(),
        view = renderWithRuntime(<ChangeableControls change={reason} />, {
          ...runtime('locked', { code_format: '^.*$' }),
          callService,
        });
      const dialog = ask(),
        input = within(dialog).getByLabelText('Codice di Porta') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'temporaneo' } });
      if (reason === 'offline') view.update({ conn: null });
      if (reason === 'unavailable')
        view.setEntities([entity('unavailable', { code_format: '^.*$' })]);
      if (reason === 'loading') view.update({ entitiesLoaded: false });
      if (reason === 'edit' || reason === 'rebind') {
        view.setEntities([
          fixtureEntity('lock.other', 'locked', { ...attributes, code_format: '^.*$' }),
        ]);
        fireEvent.click(screen.getByRole('button', { name: 'Cambia propriet�' }));
      }
      expect(input.value).toBe('');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('chiudere e riaprire richiede nuovamente il codice senza reinvio automatico', () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), {
        ...runtime('locked', { code_format: '^.*$' }),
        callService,
      });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Porta') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'temporaneo' } });
    view.unmount();
    expect(input.value).toBe('');
    renderWithRuntime(controls(), { ...runtime('locked', { code_format: '^.*$' }), callService });
    expect(within(ask()).getByLabelText('Codice di Porta')).toHaveValue('');
    expect(callService).not.toHaveBeenCalled();
  });
  it('errore permessi usa feedback generico senza ripetere il codice', async () => {
    const callService = serviceMock(async () => {
      throw new Error('negato con codice privato');
    });
    renderWithRuntime(controls(), { ...runtime('locked', { code_format: '^.*$' }), callService });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Porta') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'privato' } });
    confirm(dialog);
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
    expect(document.body.textContent).not.toContain('privato');
    expect(input.value).toBe('');
  });
  it('servizio assente o disconnessione impediscono i comandi senza tentativi differiti', () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime(), services: { lock: {} }, callService });
    expect(screen.queryByRole('button', { name: 'Sblocca Porta' })).toBeNull();
    view.update({ services, conn: null });
    expect(screen.getByRole('button', { name: 'Sblocca Porta' })).toBeDisabled();
    view.update({ conn: fakeConnection().conn });
    expect(callService).not.toHaveBeenCalled();
  });
});
