import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaMessage } from '@/@types/ha';
import { calendarWidget } from '@/components/widgets/home/calendar';
import { CALENDAR_SELECTION_KEY } from '@/components/widgets/home/calendar/CalendarDetails';
import { eventsThatFit, mergeEvents } from '@/components/widgets/home/calendar/calendarModel';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget } from './ComfortHarness';

const NOW = new Date(2026, 9, 6, 9, 0, 0); // Tuesday 6 October 2026, 09:00
const ID = 'calendar_card_1';
const settings = { calendars: ['calendar.famiglia', 'calendar.lavoro'], name: 'Agenda' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const at = (dayOffset: number, hours: number, minutes = 0) =>
  new Date(2026, 9, 6 + dayOffset, hours, minutes).toISOString();

const events = {
  'calendar.famiglia': {
    events: [
      { summary: 'Colazione', start: at(0, 8), end: at(0, 8, 30) },
      { summary: 'Dentista', start: at(0, 15), end: at(0, 16), location: 'Via Roma 3' },
      { summary: 'Compleanno di Anna', start: '2026-10-07', end: '2026-10-08' },
      { summary: 'Cena', start: at(1, 20), end: at(1, 22) },
    ],
  },
  'calendar.lavoro': {
    events: [
      { summary: 'Riunione', start: at(0, 11), end: at(0, 12) },
      { summary: 'Trasferta', start: at(4, 9), end: at(4, 18) },
    ],
  },
};

/** HA answering calendar.get_events like the legacy client expects. */
function calendarConnection(fail = false) {
  return fakeConnection((message: HaMessage) => {
    if (message.service === 'get_events') {
      if (fail) throw new Error('calendar down');
      return { response: events };
    }
    return null;
  });
}

describe('Widget calendario', () => {
  it('chiama calendar.get_events per i calendari scelti, sui prossimi 7 giorni', async () => {
    const { conn, sendMessagePromise } = calendarConnection();
    renderWidget(calendarWidget, { id: ID, settings, runtime: { conn } });
    await screen.findByText('Dentista');
    const message = sendMessagePromise.mock.calls[0][0];
    expect(message).toMatchObject({
      type: 'call_service',
      domain: 'calendar',
      service: 'get_events',
      target: { entity_id: ['calendar.famiglia', 'calendar.lavoro'] },
      return_response: true,
    });
    const data = message.service_data as { start_date_time: string; end_date_time: string };
    expect(new Date(data.start_date_time).getTime()).toBe(NOW.getTime());
    expect(new Date(data.end_date_time).getTime()).toBe(new Date(2026, 9, 13, 9).getTime());
  });

  it('2×2: oggi e i prossimi giorni, raggruppati e in ordine, con il resto contato', async () => {
    const { conn } = calendarConnection();
    renderWidget(calendarWidget, { id: ID, settings, size: { w: 2, h: 2 }, runtime: { conn } });
    const card = screen.getByRole('group', { name: 'Agenda' });
    const today = await within(card).findByRole('region', { name: 'Oggi' });
    expect(
      within(today)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['08:00–08:30Colazione', '11:00–12:00Riunione', '15:00–16:00Dentista']);
    // 2×2 shows three events; three more (two in the 3-day horizon) are counted.
    expect(within(card).getByText('Altri 2 eventi')).toBeInTheDocument();
    expect(within(card).queryByText('Trasferta')).not.toBeInTheDocument();
  });

  it('4×4: due colonne, una settimana, luogo degli eventi', async () => {
    const { conn } = calendarConnection();
    renderWidget(calendarWidget, { id: ID, settings, size: { w: 4, h: 4 }, runtime: { conn } });
    const card = screen.getByRole('group', { name: 'Agenda' });
    expect(await within(card).findByText('Trasferta')).toBeInTheDocument();
    expect(within(card).getByRole('region', { name: 'Domani' })).toHaveTextContent(
      'Tutto il giorno'
    );
    expect(within(card).getByText('Via Roma 3')).toBeInTheDocument();
    expect(card.querySelector('.home-agenda')).toHaveAttribute('data-columns', '2');
  });

  it('2×1: solo il prossimo evento', async () => {
    const { conn } = calendarConnection();
    renderWidget(calendarWidget, { id: ID, settings, size: { w: 2, h: 1 }, runtime: { conn } });
    expect(await screen.findByText('Colazione')).toBeInTheDocument();
    expect(screen.getByText(/Oggi ·/)).toHaveTextContent('Oggi · 08:00–08:30');
    expect(screen.queryByText('Riunione')).not.toBeInTheDocument();
  });

  it('senza calendari, in caricamento, in errore', async () => {
    const { update } = renderWidget(calendarWidget, { id: ID, settings: {}, runtime: {} });
    expect(
      screen.getByText('Scegli i calendari da mostrare nelle impostazioni del widget.')
    ).toBeInTheDocument();

    update({ id: ID, settings, runtime: { conn: null } });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del calendario…');

    cleanup();
    renderWidget(calendarWidget, {
      id: ID,
      settings,
      runtime: { conn: calendarConnection(true).conn },
    });
    expect(
      await screen.findByText(
        'Non riesco a leggere gli eventi da Home Assistant. Riprovo tra poco.'
      )
    ).toBeInTheDocument();
  });

  it('il tocco apre i dettagli', async () => {
    const openDetails = vi.fn();
    const { conn } = calendarConnection();
    renderWidget(calendarWidget, { id: ID, settings, runtime: { conn, openDetails } });
    await screen.findByText('Dentista');
    fireEvent.click(screen.getByRole('button', { name: 'Apri il calendario Agenda' }));
    expect(openDetails).toHaveBeenCalledWith(ID);
  });
});

describe('Capienza misurata del calendario', () => {
  it('conta gli eventi che entrano: 38 px ciascuno, 24 px per un nuovo giorno, 6 px tra eventi', () => {
    const list = mergeEvents(events);
    // Today: 24 + 38 = 62, then +44 per event of the same day.
    expect(eventsThatFit(list, 61, 1)).toBe(1);
    expect(eventsThatFit(list, 106, 1)).toBe(2);
    expect(eventsThatFit(list, 150, 1)).toBe(3);
    // Two columns filled in order: twice the height.
    expect(eventsThatFit(list, 75, 2)).toBe(3);
  });
});

describe('Dettagli calendario', () => {
  const entities = fixtureEntities([
    fixtureEntity('calendar.famiglia', 'off', { friendly_name: 'Famiglia' }),
    fixtureEntity('calendar.lavoro', 'off', { friendly_name: 'Lavoro' }),
  ]);

  it('30 giorni da oggi per tutti i calendari, eventi conclusi segnalati in testo', async () => {
    const { conn, sendMessagePromise } = calendarConnection();
    renderDetails(calendarWidget, { id: ID, settings, runtime: { conn, entities } });
    const today = await screen.findByRole('region', { name: 'Oggi' });
    expect(within(today).getByText('Concluso · Famiglia')).toBeInTheDocument();
    expect(within(today).getByText('Famiglia · Via Roma 3')).toBeInTheDocument();
    const data = sendMessagePromise.mock.calls[0][0].service_data as {
      start_date_time: string;
      end_date_time: string;
    };
    expect(new Date(data.start_date_time).getTime()).toBe(new Date(2026, 9, 6).getTime());
    expect(new Date(data.end_date_time).getTime()).toBe(new Date(2026, 10, 5, 9).getTime());
    expect(screen.getByText('2 calendari selezionati')).toBeInTheDocument();
  });

  it('la scelta dei calendari resta salvata con la chiave legacy', async () => {
    localStorage.setItem(CALENDAR_SELECTION_KEY, JSON.stringify(['calendar.lavoro']));
    const { conn, sendMessagePromise } = calendarConnection();
    renderDetails(calendarWidget, { id: ID, settings, runtime: { conn, entities } });
    await waitFor(() =>
      expect(sendMessagePromise).toHaveBeenCalledWith(
        expect.objectContaining({ target: { entity_id: ['calendar.lavoro'] } })
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Scegli i calendari' }));
    fireEvent.click(screen.getByRole('button', { name: 'Famiglia' }));
    expect(screen.getByRole('button', { name: 'Famiglia' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(JSON.parse(localStorage.getItem(CALENDAR_SELECTION_KEY) ?? '[]')).toEqual([
      'calendar.lavoro',
      'calendar.famiglia',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Deseleziona tutti' }));
    expect(
      screen.getByText('Scegli almeno un calendario per vedere gli eventi.')
    ).toBeInTheDocument();
  });
});
