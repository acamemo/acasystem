import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlarmWidget } from '@/components/widgets/home/alarm/AlarmWidget';
import { AlarmDetails } from '@/components/widgets/home/alarm/AlarmDetails';
import { ProductAlarmControls } from '@/components/widgets/home/alarm/ProductAlarmControls';
import { ProductAlarmConsole } from '@/components/widgets/home/alarm/ProductAlarmDetails';
import {
  PRODUCT_ALARM_ACTIONS,
  alarmActionAllowed,
  alarmActionSupported,
  alarmCodePolicy,
  alarmProductBinding,
  productAlarmView,
} from '@/components/widgets/home/alarm/productAlarmModel';
import { COMMAND_LABELS } from '@/components/widgets/controls/shared/labels';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'alarm',
  deviceId: 'alarm-controller',
  primaryEntityId: 'alarm_control_panel.main',
  channelEntityIds: ['alarm_control_panel.main'],
  secondaryEntityIds: ['sensor.temperature', 'sensor.battery'],
  technicalEntityIds: ['sensor.battery'],
};
const settings = { alarmId: binding.primaryEntityId, productDevice: binding, name: 'Casa' };
const attributes = {
  friendly_name: 'Centrale',
  supported_features: 63,
  code_format: null,
  code_arm_required: false,
};
const entity = (state = 'disarmed', patch: Record<string, unknown> = {}) =>
  fixtureEntity(binding.primaryEntityId, state, { ...attributes, ...patch });
const services = {
  alarm_control_panel: {
    alarm_disarm: {},
    alarm_arm_home: {},
    alarm_arm_away: {},
    alarm_arm_night: {},
    alarm_arm_custom_bypass: {},
    alarm_arm_vacation: {},
    alarm_trigger: {},
  },
};
const runtime = (state = 'disarmed', patch: Record<string, unknown> = {}) => ({
  entities: fixtureEntities([
    entity(state, patch),
    fixtureEntity('sensor.temperature', '21.5', {
      friendly_name: 'Temperatura',
      unit_of_measurement: '°C',
    }),
    fixtureEntity('sensor.battery', '90', { friendly_name: 'Batteria', unit_of_measurement: '%' }),
  ]),
  services,
  conn: fakeConnection().conn,
});
const home = (current = settings) => (
  <AlarmWidget
    id="alarm.widget"
    settingsKey="home::alarm"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={false}
  />
);
const details = (current = settings) => (
  <AlarmDetails
    id="alarm.widget"
    settingsKey="home::alarm"
    settings={current}
    onClose={() => undefined}
  />
);
const controls = (entityId = binding.primaryEntityId) => (
  <ProductAlarmControls entityId={entityId} label="Centrale" />
);
const disarm = PRODUCT_ALARM_ACTIONS[0],
  armHome = PRODUCT_ALARM_ACTIONS[1];
const ask = (action: string = armHome.label) => {
  fireEvent.click(screen.getByRole('button', { name: `${action} Centrale` }));
  return screen.getByRole('dialog', { name: `${action} Centrale?` });
};
const confirm = (dialog: HTMLElement, action: string = armHome.label) =>
  fireEvent.click(within(dialog).getByRole('button', { name: action }));
function RebindableControls() {
  const [other, setOther] = useState(false);
  return (
    <>
      <button onClick={() => setOther(true)}>Cambia canale</button>
      {controls(other ? 'alarm_control_panel.other' : binding.primaryEntityId)}
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Allarme prodotto: contratto e capacità HA 2026.10.4', () => {
  it('usa il binding v1 soltanto quando alarmId coincide con il primario', () => {
    expect(alarmProductBinding(settings)).toEqual(binding);
    expect(alarmProductBinding({ alarmId: binding.primaryEntityId })).toBeNull();
    expect(alarmProductBinding({ ...settings, alarmId: 'alarm_control_panel.other' })).toBeNull();
    expect(
      alarmProductBinding({ ...settings, productDevice: { ...binding, family: 'lock' } })
    ).toBeNull();
  });
  it.each(['unknown', 'unavailable', '', 'constructor', 'toString', '__proto__'])(
    'non descrive %s come disinserito o disponibile',
    (state) => {
      const view = productAlarmView(entity(state));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
      expect(alarmActionAllowed(view, services, disarm)).toBe(false);
    }
  );
  it('separa gli stati transitori dai target e consente Disinserisci durante arming/pending/triggered', () => {
    for (const state of ['arming', 'pending', 'triggered']) {
      const view = productAlarmView(entity(state));
      expect(alarmActionAllowed(view, services, disarm)).toBe(true);
      expect(alarmActionAllowed(view, services, armHome)).toBe(false);
    }
    expect(alarmActionAllowed(productAlarmView(entity('disarming')), services, disarm)).toBe(false);
  });
  it('ogni inserimento richiede il proprio bit e servizio; disarm non richiede bit', () => {
    for (const action of PRODUCT_ALARM_ACTIONS.slice(1)) {
      expect(
        alarmActionSupported(
          productAlarmView(entity('disarmed', { supported_features: action.feature })),
          services,
          action
        )
      ).toBe(true);
      expect(
        alarmActionSupported(
          productAlarmView(entity('disarmed', { supported_features: 0 })),
          services,
          action
        )
      ).toBe(false);
      expect(
        alarmActionSupported(productAlarmView(entity()), { alarm_control_panel: {} }, action)
      ).toBe(false);
    }
    expect(
      alarmActionSupported(
        productAlarmView(entity('armed_away', { supported_features: 0 })),
        services,
        disarm
      )
    ).toBe(true);
    expect(PRODUCT_ALARM_ACTIONS.some((action) => (action.key as string) === 'trigger')).toBe(
      false
    );
  });
  it.each([
    ['number', true, true, true, 'numeric'],
    ['text', true, true, true, 'text'],
    [null, true, true, false, 'text'],
    ['number', false, false, false, 'numeric'],
    ['text', false, false, false, 'text'],
    [null, false, false, false, 'text'],
    ['number', undefined, true, false, 'numeric'],
    [null, undefined, true, false, 'text'],
  ])(
    'politica ARM formato=%s required=%s delega senza inventare regole',
    (format, required, prompt, mandatory, mode) => {
      expect(
        alarmCodePolicy(
          productAlarmView(
            entity('disarmed', { code_format: format, code_arm_required: required })
          ),
          armHome
        )
      ).toEqual({ prompt, required: mandatory, mode });
    }
  );
  it.each(['number', 'text', null])('DISARM usa soltanto il formato dichiarato %s', (format) => {
    expect(
      alarmCodePolicy(
        productAlarmView(entity('armed_away', { code_format: format, code_arm_required: false })),
        disarm
      )
    ).toMatchObject({ prompt: format !== null, required: format !== null });
  });
  it('attributi malformati non abilitano comandi né feature inventate', () => {
    expect(
      alarmActionAllowed(
        productAlarmView(entity('disarmed', { code_format: 42 })),
        services,
        armHome
      )
    ).toBe(false);
    expect(
      alarmActionSupported(
        productAlarmView(entity('disarmed', { supported_features: '63' })),
        services,
        armHome
      )
    ).toBe(false);
  });
});

describe('Allarme prodotto: Home e Console', () => {
  it('Home singola apre la gestione senza impartire comandi', () => {
    const callService = serviceMock(),
      openDetails = vi.fn();
    renderWithRuntime(home(), { ...runtime('pending'), callService, openDetails });
    expect(screen.getByText('In attesa')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Gestisci Casa' }));
    expect(openDetails).toHaveBeenCalledWith('alarm.widget');
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByRole('group')).toBeNull();
  });
  it('Home multicanale distingue armato, transizione, allarme e indisponibilità senza comandi collettivi', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [
          binding.primaryEntityId,
          'alarm_control_panel.two',
          'alarm_control_panel.three',
          'alarm_control_panel.four',
        ],
      },
    };
    const rt = runtime('armed_home');
    renderWithRuntime(home(current), {
      ...rt,
      entities: {
        ...rt.entities,
        ...fixtureEntities([
          fixtureEntity('alarm_control_panel.two', 'pending', attributes),
          fixtureEntity('alarm_control_panel.three', 'triggered', attributes),
          fixtureEntity('alarm_control_panel.four', 'unavailable', attributes),
        ]),
      },
    });
    expect(screen.getByText('1 di 4 canali inseriti')).toBeTruthy();
    expect(screen.getByText('1 allarmi scattati')).toBeTruthy();
    expect(screen.getByText('1 in transizione')).toBeTruthy();
    expect(screen.getByText('1 non disponibili')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });
  it('canali omonimi hanno nomi e target indipendenti, con tecnica inizialmente chiusa', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'alarm_control_panel.other'],
      },
    };
    const callService = serviceMock(),
      rt = runtime();
    renderWithRuntime(details(current), {
      ...rt,
      callService,
      entities: {
        ...rt.entities,
        ...fixtureEntities([fixtureEntity('alarm_control_panel.other', 'disarmed', attributes)]),
      },
    });
    for (const id of current.productDevice.channelEntityIds)
      expect(screen.getByRole('group', { name: `Comandi di Centrale (${id})` })).toBeTruthy();
    expect(screen.getByText('Misure')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Tecnica e manutenzione' }).getAttribute('aria-expanded')
    ).toBe('false');
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inserisci in casa Centrale (alarm_control_panel.other)' })
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Inserisci in casa Centrale (alarm_control_panel.other)?',
    });
    confirm(dialog);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
      entity_id: 'alarm_control_panel.other',
    });
  });
  it('Console mantiene colonne e contenitore comuni', () => {
    const view = renderWithRuntime(
      <ProductAlarmConsole
        id="alarm.widget"
        settingsKey="home::alarm"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(
      view.container.querySelector('.widget-console-details .product-alarm-details')
    ).toBeTruthy();
  });
  it('rebind manuale rende inapplicabili i metadati storici senza modificarli', () => {
    const current = { ...settings, alarmId: 'alarm_control_panel.other' },
      rt = runtime();
    const view = renderWithRuntime(details(current), {
      ...rt,
      entities: {
        ...rt.entities,
        ...fixtureEntities([fixtureEntity('alarm_control_panel.other', 'armed_away', attributes)]),
      },
    });
    expect(view.container.querySelector('.product-alarm-details')).toBeNull();
    expect(settings.productDevice.channelEntityIds).toEqual([binding.primaryEntityId]);
  });
});

describe('Allarme prodotto: conferma e segreti transitori', () => {
  it('tutte le azioni richiedono conferma e annullare non invia nulla', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    const dialog = ask();
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('due conferme ravvicinate inviano una sola richiesta senza codice quando non richiesto', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    const dialog = ask(),
      button = within(dialog).getByRole('button', { name: armHome.label });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
      entity_id: binding.primaryEntityId,
    });
  });
  it.each(['number', 'text'])(
    'codice %s obbligatorio resta password e preserva spazi e lunghezza',
    (format) => {
      const callService = serviceMock();
      renderWithRuntime(controls(), {
        ...runtime('disarmed', { code_format: format, code_arm_required: true }),
        callService,
      });
      const dialog = ask(),
        input = within(dialog).getByLabelText('Codice di Centrale') as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.inputMode).toBe(format === 'number' ? 'numeric' : 'text');
      expect(input.hasAttribute('maxlength')).toBe(false);
      expect(within(dialog).getByRole('button', { name: armHome.label })).toBeDisabled();
      const code = '  12345678901234567890 è una passphrase  ';
      fireEvent.change(input, { target: { value: code } });
      confirm(dialog);
      expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
        entity_id: binding.primaryEntityId,
        code,
      });
      expect(input.value).toBe('');
      expect(document.body.textContent).not.toContain(code);
    }
  );
  it.each([true, undefined])(
    'formato None con required=%s delega a HA anche senza codice',
    (required) => {
      const callService = serviceMock();
      renderWithRuntime(controls(), {
        ...runtime('disarmed', { code_format: null, code_arm_required: required }),
        callService,
      });
      const dialog = ask(),
        input = within(dialog).getByLabelText(
          'Codice (facoltativo) di Centrale'
        ) as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.inputMode).toBe('text');
      expect(within(dialog).getByRole('button', { name: armHome.label })).not.toBeDisabled();
      confirm(dialog);
      expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
        entity_id: binding.primaryEntityId,
      });
    }
  );
  it('codice facoltativo compilato viene passato senza normalizzazione', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: null, code_arm_required: true }),
      callService,
    });
    const dialog = ask();
    fireEvent.change(within(dialog).getByLabelText('Codice (facoltativo) di Centrale'), {
      target: { value: '  default personale  ' },
    });
    confirm(dialog);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
      entity_id: binding.primaryEntityId,
      code: '  default personale  ',
    });
  });
  it('required=false non richiede né invia codice anche con formato dichiarato', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: 'number', code_arm_required: false }),
      callService,
    });
    const dialog = ask();
    expect(within(dialog).queryByLabelText(/Codice/)).toBeNull();
    confirm(dialog);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
      entity_id: binding.primaryEntityId,
    });
  });
  it('Disinserisci richiede il codice dichiarato indipendentemente da code_arm_required', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('triggered', { code_format: 'text', code_arm_required: false }),
      callService,
    });
    const dialog = ask(disarm.label),
      input = within(dialog).getByLabelText('Codice di Centrale');
    fireEvent.change(input, { target: { value: ' disarma  ' } });
    confirm(dialog, disarm.label);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_disarm', {
      entity_id: binding.primaryEntityId,
      code: ' disarma  ',
    });
  });
  it('Enter duplicato invia una sola richiesta e pulisce il campo subito', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
      callService,
    });
    const input = within(ask()).getByLabelText('Codice di Centrale');
    fireEvent.change(input, { target: { value: 'privato' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
  });
  it('Annulla pulisce il codice anche nella Sheet in uscita', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
      callService,
    });
    const dialog = ask(),
      input = within(dialog).getByLabelText('Codice di Centrale');
    fireEvent.change(input, { target: { value: 'privato' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(input).toHaveValue('');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(callService).not.toHaveBeenCalled();
  });
  it.each(['offline', 'unavailable', 'edit', 'loading', 'rebind', 'capability'])(
    'pulisce il codice e rifiuta una conferma trattenuta dopo %s',
    (reason) => {
      const callService = serviceMock(),
        view = renderWithRuntime(<RebindableControls />, {
          ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
          callService,
        });
      const input = within(ask()).getByLabelText('Codice di Centrale');
      fireEvent.change(input, { target: { value: 'privato' } });
      if (reason === 'offline') view.update({ conn: null });
      if (reason === 'unavailable')
        view.setEntities([entity('unavailable', { code_format: 'text', code_arm_required: true })]);
      if (reason === 'edit') view.update({ editMode: true });
      if (reason === 'loading') view.update({ entitiesLoaded: false });
      if (reason === 'capability') view.update({ services: { alarm_control_panel: {} } });
      if (reason === 'rebind')
        fireEvent.click(screen.getByRole('button', { name: 'Cambia canale' }));
      expect(input).toHaveValue('');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('unmount e successiva apertura non conservano codice o richieste', () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), {
        ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
        callService,
      });
    const input = within(ask()).getByLabelText('Codice di Centrale');
    fireEvent.change(input, { target: { value: 'privato' } });
    view.unmount();
    expect(input).toHaveValue('');
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
      callService,
    });
    expect(within(ask()).getByLabelText('Codice di Centrale')).toHaveValue('');
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('Allarme prodotto: esito e richieste indipendenti', () => {
  it('Disinserisci interrompe arm pendente prima del primo evento HA senza perdere un errore tardivo', async () => {
    let rejectArm!: (reason: Error) => void;
    const held = new Promise<never>((_resolve, reject) => {
      rejectArm = reject;
    });
    const callService = serviceMock(async (_domain, service) => {
      if (service === 'alarm_arm_home') return held;
      return undefined;
    });
    renderWithRuntime(controls(), { ...runtime(), callService });
    confirm(ask());
    expect(screen.getByRole('button', { name: 'Disinserisci Centrale' })).not.toBeDisabled();
    const dialog = ask(disarm.label),
      button = within(dialog).getByRole('button', { name: disarm.label });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenLastCalledWith('alarm_control_panel', 'alarm_disarm', {
      entity_id: binding.primaryEntityId,
    });
    expect(screen.getByText('Richiesto · Inserito in casa')).toBeTruthy();
    rejectArm(new Error('rifiuto tardivo'));
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
    expect(callService).toHaveBeenCalledTimes(2);
  });
  it('ACK e stati arming/pending non confermano il target finale', async () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime(), callService });
    confirm(ask());
    await flush();
    expect(screen.getByText('Richiesto · Inserito in casa')).toBeTruthy();
    view.setEntities([entity('arming')]);
    view.setEntities([entity('pending')]);
    expect(screen.getByText('Richiesto · Inserito in casa')).toBeTruthy();
    view.setEntities([entity('armed_home')]);
    expect(screen.queryByText('Richiesto · Inserito in casa')).toBeNull();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('Disinserisci resta disponibile durante l’inserimento richiesto senza cancellarne il tracking', async () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime(), callService });
    confirm(ask());
    await flush();
    view.setEntities([entity('arming')]);
    confirm(ask(disarm.label), disarm.label);
    expect(callService).toHaveBeenNthCalledWith(2, 'alarm_control_panel', 'alarm_disarm', {
      entity_id: binding.primaryEntityId,
    });
    expect(screen.getByText('Richiesto · Inserito in casa')).toBeTruthy();
    view.setEntities([entity('disarming')]);
    expect(screen.getByText('Richiesto · Disinserito')).toBeTruthy();
    view.setEntities([entity('disarmed')]);
    expect(screen.queryByText('Richiesto · Disinserito')).toBeNull();
  });
  it('timeout a 30 secondi rimane esito non determinato e non reinvia', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    confirm(ask());
    await flush();
    act(() => vi.advanceTimersByTime(29999));
    expect(screen.getByText('Richiesto · Inserito in casa')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(COMMAND_LABELS.timeout)).toBeTruthy();
    expect(callService).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60000));
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('rifiuto HA usa feedback generico senza codice, salvataggi o retry', async () => {
    const callService = serviceMock(async () => {
        throw new Error('negato con segreto privato');
      }),
      save = vi.fn();
    const local = vi.spyOn(Storage.prototype, 'setItem');
    renderWithRuntime(controls(), {
      ...runtime('disarmed', { code_format: 'text', code_arm_required: true }),
      callService,
      saveCardSetting: save,
    });
    const input = within(ask()).getByLabelText('Codice di Centrale');
    fireEvent.change(input, { target: { value: 'segreto privato' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
    expect(document.body.textContent).not.toContain('segreto privato');
    expect(input).toHaveValue('');
    expect(local).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('assenza servizio, disconnessione e successiva riconnessione non accodano azioni', () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), {
        ...runtime(),
        services: { alarm_control_panel: {} },
        callService,
      });
    expect(screen.queryByRole('button', { name: 'Inserisci in casa Centrale' })).toBeNull();
    view.update({ services, conn: null });
    expect(screen.getByRole('button', { name: 'Inserisci in casa Centrale' })).toBeDisabled();
    view.update({ conn: fakeConnection().conn });
    expect(callService).not.toHaveBeenCalled();
  });
});
