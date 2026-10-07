import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageIndicator, pageValueText } from '@/components/system/page-indicator/PageIndicator';
import { StatusBar } from '@/components/system/status-bar/StatusBar';
import { ConnectionNotice, formatElapsed } from '@/components/system/status-bar/ConnectionNotice';
import { TearCalendar } from '@/components/system/tear-calendar/TearCalendar';
import { CoverPage } from '@/pages/cover/CoverPage';
import { clockText, coverDate, monthMatrix } from '@/utils/launcher/calendar';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { connectionSummary } from '@/utils/launcher/connection';

describe('launcher page indicator', () => {
  const labels = ['Copertina', 'Casa', 'Luci', 'Clima'];

  it('exposes a range with «Pagina N di M: nome»', () => {
    render(<PageIndicator labels={labels} index={2} onChange={() => undefined} />);
    const range = screen.getByRole('slider', { name: 'Pagina' });
    expect(range).toHaveAttribute('min', '1');
    expect(range).toHaveAttribute('max', '4');
    expect(range).toHaveValue('3');
    expect(range).toHaveAttribute('aria-valuetext', 'Pagina 3 di 4: Luci');
    expect(pageValueText(0, 1, undefined)).toBe('Pagina 1 di 1');
  });

  it('moves the ball by index and reports the chosen page', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <PageIndicator labels={labels} index={1} onChange={onChange} />
    );
    const track = container.querySelector<HTMLElement>('.aca-indicator__track');
    expect(track?.style.getPropertyValue('--aca-steps')).toBe('4');
    expect(track?.style.getPropertyValue('--aca-index')).toBe('1');
    expect(container.querySelectorAll('.aca-indicator__dot')).toHaveLength(4);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(3);
    rerender(<PageIndicator labels={labels} index={3} onChange={onChange} />);
    expect(track?.style.getPropertyValue('--aca-index')).toBe('3');
  });

  it('shows only the name when there is one page', () => {
    const { container } = render(
      <PageIndicator labels={['Casa']} index={0} onChange={() => undefined} />
    );
    expect(screen.queryByRole('slider')).toBeNull();
    expect(container.querySelector('.aca-indicator__track')).toBeNull();
    expect(screen.getByText('Casa')).toBeVisible();
  });
});

describe('launcher cover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 6, 14, 5, 9));
  });
  afterEach(() => vi.useRealTimers());

  it('formats the date in Italian, weeks from Monday', () => {
    const date = coverDate(new Date(2026, 9, 6));
    expect(date).toMatchObject({
      weekday: 'Martedì',
      month: 'Ottobre',
      day: 6,
      year: 2026,
      iso: '2026-10-06',
    });
    expect(date.spoken).toBe('martedì 6 ottobre 2026');
    expect(clockText(new Date(2026, 9, 6, 9, 3, 7))).toEqual({
      short: '09:03',
      long: '09:03:07',
      iso: '09:03:07',
    });
    // October 2026 starts on Thursday: three empty cells, five weeks.
    const weeks = monthMatrix(2026, 9);
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks).toHaveLength(5);
    expect(weeks[4]).toEqual([26, 27, 28, 29, 30, 31, null]);
  });

  it('shows the calendar with today pressed and the ticking clock', () => {
    const { container } = render(<CoverPage />);
    expect(screen.getByText('Ottobre')).toBeInTheDocument();
    expect(screen.getByText('Martedì')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    const today = container.querySelector('td[aria-current="date"]');
    expect(today).toHaveTextContent('6');
    expect(today?.querySelector('.aca-m--well')).not.toBeNull();
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveAttribute('abbr', 'Lunedì');
    expect(headers[0]).toHaveTextContent('L');
    expect(headers[6]).toHaveAttribute('abbr', 'Domenica');
    expect(container.querySelector('.aca-tear__time')).toHaveTextContent('14:05:09');

    act(() => {
      // The clock ticks just after each second boundary.
      vi.advanceTimersByTime(2100);
    });
    expect(container.querySelector('.aca-tear__time')).toHaveTextContent('14:05:11');
  });

  it('stops the cover clock off screen and refreshes immediately when shown', () => {
    const { container, rerender } = render(
      <PageVisibilityContext value={true}>
        <CoverPage />
      </PageVisibilityContext>
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    rerender(
      <PageVisibilityContext value={false}>
        <CoverPage />
      </PageVisibilityContext>
    );
    expect(vi.getTimerCount()).toBe(0);
    const hiddenTime = container.querySelector('.aca-tear__time')?.textContent;
    act(() => vi.advanceTimersByTime(5000));
    expect(container.querySelector('.aca-tear__time')?.textContent).toBe(hiddenTime);
    rerender(
      <PageVisibilityContext value={true}>
        <CoverPage />
      </PageVisibilityContext>
    );
    expect(container.querySelector('.aca-tear__time')).toHaveTextContent('14:05:14');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('labels the big date for assistive technologies', () => {
    render(<TearCalendar now={new Date(2026, 0, 1, 8, 0, 0)} />);
    expect(screen.getByLabelText('giovedì 1 gennaio 2026')).toHaveAttribute(
      'datetime',
      '2026-01-01'
    );
  });
});

describe('launcher status bar', () => {
  it('shows clock, connection, chips and the two round buttons', () => {
    const onToggleEdit = vi.fn();
    const onOpenSystem = vi.fn();
    const onChipPress = vi.fn();
    render(
      <StatusBar
        time={new Date(2026, 9, 6, 7, 4)}
        connection={connectionSummary({
          connected: true,
          entitiesLoaded: true,
          haUnavailableVisible: false,
          oauthExpired: false,
        })}
        chips={[
          {
            id: 'person.a',
            kind: 'person',
            label: 'Mario',
            detail: 'A casa',
            icon: 'profile',
            tone: 'active',
            targetId: 'person.a',
          },
          {
            id: 'p1',
            kind: 'group',
            label: 'Luci accese',
            detail: '3',
            icon: 'light',
            tone: 'active',
          },
        ]}
        isChipInteractive={(chip) => chip.kind === 'person'}
        onChipPress={onChipPress}
        editMode={false}
        onToggleEdit={onToggleEdit}
        onOpenSystem={onOpenSystem}
        updateCount={2}
      />
    );
    expect(screen.getByText('07:04')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Collegato');
    fireEvent.click(screen.getByRole('button', { name: /Mario/ }));
    expect(onChipPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Luci accese/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    expect(onToggleEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sistema, 2 aggiornamenti disponibili' }));
    expect(onOpenSystem).toHaveBeenCalled();
  });

  it('shows «Fine» in edit mode and hides the clock on the cover, keeping its place', () => {
    const { container } = render(
      <StatusBar
        time={null}
        connection={{ phase: 'error', label: 'Non raggiungibile' }}
        chips={[]}
        editMode
        onToggleEdit={() => undefined}
        onOpenSystem={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Fine' })).toBeInTheDocument();
    // REP-20261007-001 (L-14, K22): an invisible, silent placeholder instead of the clock.
    expect(container.querySelector('time')).toBeNull();
    expect(container.querySelector('.aca-status-bar__time--reserved')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Non raggiungibile');
  });

  it('summarises the connection like the legacy banner', () => {
    const base = {
      connected: false,
      entitiesLoaded: true,
      haUnavailableVisible: false,
      oauthExpired: false,
    };
    expect(connectionSummary({ ...base, connected: true }).phase).toBe('connected');
    expect(connectionSummary({ ...base, entitiesLoaded: false }).phase).toBe('connecting');
    expect(connectionSummary(base).phase).toBe('reconnecting');
    expect(connectionSummary({ ...base, haUnavailableVisible: true }).phase).toBe('error');
    expect(connectionSummary({ ...base, connected: true, oauthExpired: true })).toEqual({
      phase: 'error',
      label: 'Sessione scaduta',
    });
  });

  it('announces the connection notice once, with the ticking timer outside the live region', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0, 0));
    render(
      <ConnectionNotice
        visible
        oauthExpired={false}
        disconnectedSince={Date.now() - 125000}
        onRetry={() => undefined}
        onSignIn={() => undefined}
      />
    );
    const live = screen.getByRole('status');
    const initial = live.textContent;
    expect(screen.getByText('Disconnesso da 2 min 5 s').closest('[aria-live="polite"]')).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(live.textContent).toBe(initial);
    expect(screen.getByText('Disconnesso da 2 min 8 s')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('explains a lost connection with the time and a retry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0, 0));
    const onRetry = vi.fn();
    render(
      <ConnectionNotice
        visible
        oauthExpired={false}
        disconnectedSince={Date.now() - 125000}
        onRetry={onRetry}
        onSignIn={() => undefined}
      />
    );
    expect(screen.getByText('Disconnesso da 2 min 5 s')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(onRetry).toHaveBeenCalled();
    expect(formatElapsed(42)).toBe('42 s');
    expect(formatElapsed(3720)).toBe('1 h 2 min');
    vi.useRealTimers();
  });
});
