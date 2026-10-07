import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { alarmWidget } from '@/components/widgets/home/alarm';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderDetails, renderWidget, serviceMock } from './ComfortHarness';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ID = 'alarm_card_1';
const settings = { alarmId: 'alarm_control_panel.casa' };

function panel(state: string, attributes: Record<string, unknown> = {}) {
  return fixtureEntity('alarm_control_panel.casa', state, {
    friendly_name: 'Casa',
    supported_features: 1 + 2 + 4, // home, away, night
    code_format: null,
    ...attributes,
  });
}

const withPin = { code_format: 'number', code_arm_required: false };

describe('Widget allarme: rendering per taglia e stati', () => {
  it('2×2 disinserito: stato, nome e due azioni di inserimento', () => {
    renderWidget(alarmWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { entities: fixtureEntities([panel('disarmed')]) },
    });
    const card = screen.getByRole('group', { name: 'Casa' });
    expect(within(card).getByText('Disinserito')).toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole('button', { name: /^Inserisci/ })
        .map((b) => b.textContent)
    ).toEqual(['Inserisci in casa', 'Inserisci fuori casa']);
  });

  it('2×1 inserito: una sola azione, disinserisci', () => {
    renderWidget(alarmWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 1 },
      runtime: { entities: fixtureEntities([panel('armed_away', { changed_by: 'Marta' })]) },
    });
    expect(screen.getByText('Inserito fuori casa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disinserisci' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^Inserisci/ })).not.toBeInTheDocument();
  });

  it('allarme scattato, transizione e non disponibile', () => {
    const { update } = renderWidget(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('triggered')]) },
    });
    expect(screen.getByText('Allarme scattato')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Casa' })).toHaveAttribute(
      'data-widget-error',
      'true'
    );

    update({ id: ID, settings, runtime: { entities: fixtureEntities([panel('arming')]) } });
    expect(screen.getByText('Inserimento in corso')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Inserisci|Disinserisci/ })
    ).not.toBeInTheDocument();

    update({ id: ID, settings, runtime: { entities: fixtureEntities([panel('unavailable')]) } });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();

    update({ id: ID, settings, runtime: { entities: {} } });
    expect(
      screen.getByText('La centrale d’allarme non è più presente in Home Assistant.')
    ).toBeInTheDocument();
  });

  it('in modalità modifica le azioni sono disabilitate', () => {
    const callService = serviceMock();
    renderWidget(alarmWidget, {
      id: ID,
      settings,
      editMode: true,
      runtime: { entities: fixtureEntities([panel('disarmed')]), callService },
    });
    const button = screen.getByRole('button', { name: 'Inserisci in casa' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('Widget allarme: servizi come il legacy', () => {
  it('senza codice: alarm_arm_home con il solo entity_id, in attesa fino al nuovo stato', () => {
    const callService = serviceMock();
    const { update } = renderWidget(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('disarmed')]), callService },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inserisci in casa' }));
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_home', {
      entity_id: 'alarm_control_panel.casa',
    });
    expect(screen.getByRole('button', { name: 'Inserisci in casa' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByText('In attesa di conferma')).toBeInTheDocument();

    update({
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('arming')]), callService },
    });
    expect(screen.queryByText('In attesa di conferma')).not.toBeInTheDocument();
  });

  it('con PIN richiesto: la card non invia nulla e apre il dettaglio', () => {
    const callService = serviceMock();
    const openDetails = vi.fn();
    renderWidget(alarmWidget, {
      id: ID,
      settings,
      runtime: {
        entities: fixtureEntities([panel('armed_away', withPin)]),
        callService,
        openDetails,
      },
    });
    const disarm = screen.getByRole('button', { name: 'Disinserisci' });
    expect(disarm).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(disarm);
    expect(callService).not.toHaveBeenCalled();
    expect(openDetails).toHaveBeenCalledWith(ID);
  });

  it('errore del comando', async () => {
    const callService = serviceMock(new Error('no'));
    renderWidget(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('disarmed')]), callService },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inserisci fuori casa' }));
    expect(
      await screen.findByText('Comando non riuscito. Riprova dal dettaglio.')
    ).toBeInTheDocument();
  });
});

describe('Dettagli allarme: tastierino PIN', () => {
  it('il codice va solo al servizio: niente salvataggi, log o testo visibile, campo svuotato', async () => {
    const callService = serviceMock();
    const saveCardSetting = vi.fn();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined)
    );
    renderDetails(alarmWidget, {
      id: ID,
      settings,
      runtime: {
        entities: fixtureEntities([panel('armed_away', withPin)]),
        callService,
        saveCardSetting,
      },
    });
    const actions = screen.getByRole('group', { name: 'Azioni' });
    expect(within(actions).getByRole('button', { name: /Disinserisci/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const keypad = screen.getByRole('group', { name: 'Tastierino PIN' });
    for (const digit of ['9', '7', '3', '1'])
      fireEvent.click(within(keypad).getByRole('button', { name: digit }));
    const field = screen.getByLabelText('PIN');
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('autocomplete', 'off');
    expect(field).toHaveValue('9731');
    expect(document.body.textContent).not.toContain('9731');

    fireEvent.click(within(keypad).getByRole('button', { name: 'Conferma: Disinserisci' }));
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm_control_panel.casa',
      code: '9731',
    });
    expect(field).toHaveValue('');
    await waitFor(() => expect(screen.getByText(/In attesa di conferma/)).toBeInTheDocument());

    expect(saveCardSetting).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    for (const spy of logs) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain('9731');
    }
  });

  it('PIN mancante: messaggio sul campo e nessuna chiamata; cancella l’ultima cifra', () => {
    const callService = serviceMock();
    renderDetails(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('armed_home', withPin)]), callService },
    });
    const keypad = screen.getByRole('group', { name: 'Tastierino PIN' });
    fireEvent.click(within(keypad).getByRole('button', { name: 'Conferma: Disinserisci' }));
    expect(callService).not.toHaveBeenCalled();
    const field = screen.getByLabelText('PIN');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Inserisci il PIN');

    fireEvent.click(within(keypad).getByRole('button', { name: '7' }));
    fireEvent.click(within(keypad).getByRole('button', { name: '8' }));
    fireEvent.click(within(keypad).getByRole('button', { name: 'Cancella l’ultima cifra' }));
    expect(field).toHaveValue('7');
    fireEvent.change(field, { target: { value: '12ab34' } });
    expect(field).toHaveValue('1234');
  });

  it('inserimento senza codice richiesto: pulsante diretto, servizio senza code', () => {
    const callService = serviceMock();
    renderDetails(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('disarmed', withPin)]), callService },
    });
    const actions = screen.getByRole('group', { name: 'Azioni' });
    fireEvent.click(within(actions).getByRole('button', { name: /Inserisci notte/ }));
    expect(screen.queryByRole('group', { name: 'Tastierino PIN' })).not.toBeInTheDocument();
    const confirm = screen
      .getAllByRole('button', { name: 'Inserisci notte' })
      .at(-1) as HTMLElement;
    fireEvent.click(confirm);
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_night', {
      entity_id: 'alarm_control_panel.casa',
    });
  });

  it('azione scelta sulla card: preselezionata, il foglio si chiude dopo l’invio', async () => {
    const callService = serviceMock();
    const onClose = vi.fn();
    const entities = fixtureEntities([panel('disarmed', { ...withPin, code_arm_required: true })]);
    renderWidget(alarmWidget, { id: ID, settings, runtime: { entities, callService } });
    fireEvent.click(screen.getByRole('button', { name: 'Inserisci fuori casa' }));
    cleanup();

    renderDetails(alarmWidget, { id: ID, settings, onClose, runtime: { entities, callService } });
    const actions = screen.getByRole('group', { name: 'Azioni' });
    expect(within(actions).getByRole('button', { name: /Inserisci fuori casa/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const keypad = screen.getByRole('group', { name: 'Tastierino PIN' });
    fireEvent.click(within(keypad).getByRole('button', { name: '5' }));
    fireEvent.click(within(keypad).getByRole('button', { name: 'Conferma: Inserisci fuori casa' }));
    expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_away', {
      entity_id: 'alarm_control_panel.casa',
      code: '5',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('errore del servizio: messaggio e PIN già svuotato', async () => {
    const callService = serviceMock(new Error('codice errato'));
    renderDetails(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('armed_home', withPin)]), callService },
    });
    const field = screen.getByLabelText('PIN');
    fireEvent.change(field, { target: { value: '9999' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(
      await screen.findByText(
        'Comando non riuscito. Controlla il PIN e i permessi di Home Assistant.'
      )
    ).toBeInTheDocument();
    expect(field).toHaveValue('');
  });

  it('codice testuale: azioni con codice disabilitate e spiegazione', () => {
    renderDetails(alarmWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([panel('armed_home', { code_format: 'text' })]) },
    });
    expect(
      screen.getAllByText(
        'Questo allarme usa un codice testuale: il tastierino accetta solo PIN numerici.'
      )
    ).not.toHaveLength(0);
    expect(
      within(screen.getByRole('group', { name: 'Azioni' })).getByRole('button', {
        name: /Disinserisci/,
      })
    ).toBeDisabled();
  });
});
