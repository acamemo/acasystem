import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { climateWidget } from '@/components/widgets/home/climate';
import { SLIDER_COMMIT_DELAY_MS } from '@/components/widgets/home/climate/ClimateDetails';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderDetails, renderWidget, serviceMock } from './ComfortHarness';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ID = 'climate_card_1';

/** Target figure of the stepper: number and unit live in separate nodes. */
const target = (text: string) =>
  screen.getByText((_, element) =>
    Boolean(element?.classList.contains('home-stepper__number') && element.textContent === text)
  );
const settings = { climateId: 'climate.soggiorno' };

function thermostat(state = 'heat', attributes: Record<string, unknown> = {}) {
  return fixtureEntity('climate.soggiorno', state, {
    friendly_name: 'Soggiorno',
    current_temperature: 20.5,
    temperature: 21,
    min_temp: 7,
    max_temp: 35,
    hvac_action: 'heating',
    hvac_modes: ['off', 'heat', 'cool', 'auto'],
    fan_modes: ['auto', 'low', 'high'],
    fan_mode: 'auto',
    swing_modes: ['off', 'vertical'],
    swing_mode: 'off',
    preset_modes: ['none', 'eco', 'comfort'],
    preset_mode: 'none',
    ...attributes,
  });
}

describe('Widget clima: rendering per taglia e stati', () => {
  it('2×2: temperatura attuale, obiettivo, azione e nome', () => {
    renderWidget(climateWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { entities: fixtureEntities([thermostat()]) },
    });
    const card = screen.getByRole('group', { name: 'Soggiorno' });
    expect(card).toHaveAttribute('data-state', 'on');
    expect(within(card).getByText('20,5 °C')).toBeInTheDocument();
    expect(
      within(card).getByText(
        (_, element) =>
          element?.textContent === '21 °C' && element.classList.contains('home-stepper__number')
      )
    ).toBeInTheDocument();
    expect(within(card).getByText('Riscalda')).toBeInTheDocument();
    expect(within(card).getByText('Ventola automatica')).toBeInTheDocument();
    expect(within(card).getByRole('switch', { name: 'Accensione di Soggiorno' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('2×1: riga compatta con valore e azione, sempre con i comandi ±', () => {
    renderWidget(climateWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 1 },
      runtime: { entities: fixtureEntities([thermostat()]) },
    });
    expect(screen.getByRole('group', { name: 'Soggiorno' })).toHaveTextContent(
      '20,5 °C · Riscalda'
    );
    expect(screen.getByRole('button', { name: 'Aumenta di mezzo grado' })).toBeEnabled();
    expect(screen.queryByText('Ventola automatica')).not.toBeInTheDocument();
  });

  it('caricamento, entità non configurata, mancante e non disponibile', () => {
    const { update } = renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entitiesLoaded: false },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del clima…');

    update({ id: ID, settings: {}, runtime: {} });
    expect(
      screen.getByText('Scegli un termostato nelle impostazioni del widget.')
    ).toBeInTheDocument();

    update({ id: ID, settings, runtime: { entities: {} } });
    expect(
      screen.getByText('Il termostato non è più presente in Home Assistant.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clima' })).toBeInTheDocument();
    expect(screen.getByText('climate.soggiorno')).toBeInTheDocument();

    update({
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat('unavailable')]) },
    });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aumenta di mezzo grado' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('il tocco sulla card apre i dettagli', () => {
    const openDetails = vi.fn();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), openDetails },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apri i dettagli di Soggiorno' }));
    expect(openDetails).toHaveBeenCalledWith(ID);
  });

  it('in modalità modifica i comandi sono disabilitati e la card non apre i dettagli', () => {
    const callService = serviceMock();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      editMode: true,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    expect(screen.queryByRole('button', { name: /Apri i dettagli/ })).not.toBeInTheDocument();
    for (const name of ['Aumenta di mezzo grado', 'Diminuisci di mezzo grado']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('switch'));
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('Widget clima: servizi come il legacy', () => {
  it('± chiama climate.set_temperature con entity_id e temperatura (passo 0,5)', () => {
    const callService = serviceMock();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta di mezzo grado' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 21.5,
    });
  });

  it('obiettivo mancante: parte da 21 come il legacy', () => {
    const callService = serviceMock();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: {
        entities: fixtureEntities([thermostat('heat', { temperature: null })]),
        callService,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Diminuisci di mezzo grado' }));
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 20.5,
    });
  });

  it('richiesto vs confermato: in attesa finché HA non riporta il nuovo obiettivo', () => {
    const callService = serviceMock();
    const { update } = renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta di mezzo grado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta di mezzo grado' }));
    // The second step starts from the requested value, not from the confirmed one.
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 22,
    });
    expect(target('22 °C')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('In attesa di conferma')).toBeInTheDocument();

    update({
      id: ID,
      settings,
      runtime: {
        entities: fixtureEntities([thermostat('heat', { temperature: 22 })]),
        callService,
      },
    });
    expect(target('22 °C')).not.toHaveAttribute('aria-busy');
    expect(screen.getByText('Obiettivo')).toBeInTheDocument();
  });

  it('errore del comando: torna al valore confermato e lo dice', async () => {
    const callService = serviceMock(new Error('rifiutato'));
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta di mezzo grado' }));
    expect(await screen.findByText('Temperatura non impostata')).toBeInTheDocument();
    expect(target('21 °C')).toBeInTheDocument();
    // The frame belongs to the launcher: the widget exposes the error, the text explains it.
    expect(screen.getByRole('group', { name: 'Soggiorno' })).toHaveAttribute(
      'data-widget-error',
      'true'
    );
  });

  it('accensione: turn_off quando supportato, altrimenti set_hvac_mode come il legacy', () => {
    const callService = serviceMock();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: {
        entities: fixtureEntities([thermostat('heat', { supported_features: 128 + 256 })]),
        callService,
      },
    });
    fireEvent.click(screen.getByRole('switch'));
    expect(callService).toHaveBeenLastCalledWith('climate', 'turn_off', {
      entity_id: 'climate.soggiorno',
    });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-busy', 'true');

    cleanup();
    callService.mockClear();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat('heat')]), callService },
    });
    fireEvent.click(screen.getByRole('switch'));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'off',
    });

    cleanup();
    renderWidget(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat('off')]), callService },
    });
    fireEvent.click(screen.getByRole('switch'));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'auto',
    });
  });

  it('tapAction toggle: il tocco sulla card accende o spegne, i dettagli hanno un pulsante', () => {
    const callService = serviceMock();
    const openDetails = vi.fn();
    renderWidget(climateWidget, {
      id: ID,
      settings: { ...settings, tapAction: 'toggle' },
      runtime: { entities: fixtureEntities([thermostat('off')]), callService, openDetails },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accendi o spegni Soggiorno' }));
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'auto',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Soggiorno' }));
    expect(openDetails).toHaveBeenCalledWith(ID);
  });
});

describe('Dettagli clima: temperatura, modalità, preset, ventola e oscillazione', () => {
  it('modalità e scorciatoie chiamano set_hvac_mode; la scelta resta in attesa fino alla conferma', () => {
    const callService = serviceMock();
    const { update } = renderDetails(climateWidget, {
      id: ID,
      settings: { ...settings, climateFavoriteModes: ['heat', 'off'] },
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    const shortcuts = screen.getByRole('group', { name: 'Scorciatoie' });
    expect(
      within(shortcuts)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Caldo', 'Spento']);
    const modes = screen.getByRole('group', { name: 'Tutte le modalità' });
    fireEvent.click(within(modes).getByRole('button', { name: 'Freddo' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'cool',
    });
    expect(within(modes).getByRole('button', { name: 'Freddo' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(modes).getByRole('button', { name: 'Freddo' })).toHaveAttribute(
      'aria-busy',
      'true'
    );

    update({
      id: ID,
      settings: { ...settings, climateFavoriteModes: ['heat', 'off'] },
      runtime: { entities: fixtureEntities([thermostat('cool')]), callService },
    });
    expect(within(modes).getByRole('button', { name: 'Freddo' })).not.toHaveAttribute('aria-busy');
  });

  it('preset, ventola e oscillazione con i servizi di HA', () => {
    const callService = serviceMock();
    renderDetails(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Preset' })).getByRole('button', { name: 'Eco' })
    );
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_preset_mode', {
      entity_id: 'climate.soggiorno',
      preset_mode: 'eco',
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Ventola' })).getByRole('button', { name: 'Alta' })
    );
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_fan_mode', {
      entity_id: 'climate.soggiorno',
      fan_mode: 'high',
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Oscillazione' })).getByRole('button', {
        name: 'Verticale',
      })
    );
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_swing_mode', {
      entity_id: 'climate.soggiorno',
      swing_mode: 'vertical',
    });
  });

  it('il cursore invia set_temperature quando il gesto si ferma', () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderDetails(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    const slider = screen.getByRole('slider', { name: 'Temperatura desiderata' });
    fireEvent.change(slider, { target: { value: '22' } });
    fireEvent.change(slider, { target: { value: '23.5' } });
    expect(callService).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SLIDER_COMMIT_DELAY_MS);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 23.5,
    });
  });

  it('interruttore Acceso/Spento con stato in attesa ed errore', async () => {
    const callService = serviceMock(new Error('no'));
    renderDetails(climateWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([thermostat()]), callService },
    });
    const toggle = screen.getByRole('switch', { name: 'Accensione' });
    fireEvent.click(toggle);
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'off',
    });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-invalid', 'true'));
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByText('Home Assistant non ha eseguito il comando. Riprova.')
    ).toBeInTheDocument();
  });
});
