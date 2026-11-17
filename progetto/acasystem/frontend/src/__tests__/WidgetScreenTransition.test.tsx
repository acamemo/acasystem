import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button, Console, Popover } from '@/components/primitives';
import { WidgetConsole } from '@/templates/launcher/WidgetConsole';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime } from './ControlsHarness';

const animationDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'getAnimations');
const mediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');

function motion(animated = true, reduced = false) {
  Object.defineProperty(document.documentElement, 'getAnimations', { configurable: true, value: animated ? () => [] : undefined });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (media: string) => ({
    media, matches: reduced && media.includes('prefers-reduced-motion'),
    addEventListener: () => undefined, removeEventListener: () => undefined,
  }) });
}

beforeEach(() => {
  vi.useFakeTimers();
  motion();
  // Owner-controlled closing in these tests; history integration has its own real-task tests.
  vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (animationDescriptor) Object.defineProperty(document.documentElement, 'getAnimations', animationDescriptor);
  else Reflect.deleteProperty(document.documentElement, 'getAnimations');
  if (mediaDescriptor) Object.defineProperty(window, 'matchMedia', mediaDescriptor);
  else Reflect.deleteProperty(window, 'matchMedia');
});

function panel(open = true) {
  return <Console open={open} onClose={() => undefined} title="Widget" actions={<button>Azione</button>}>
    <input aria-label="Valore" />
    <button>Ultimo comando</button>
  </Console>;
}

describe('widget window presence', () => {
  it('shows title, actions and content together without a staged body or artificial wait', () => {
    render(panel());
    const body = document.querySelector('.aca-console__body')!;
    const back = screen.getByRole('button', { name: 'Chiudi' });
    expect(back).toHaveFocus();
    expect(body).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Azione' }).closest('[inert]')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Valore' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Ultimo comando' })).toHaveFocus();
    act(() => vi.advanceTimersByTime(120));
    expect(body).not.toHaveAttribute('inert');
  });

  it('retains the same window on a close/reopen interruption without concealing its content', () => {
    const view = render(panel());
    const window = document.querySelector('.aca-console');
    const body = document.querySelector('.aca-console__body')!;
    view.rerender(panel(false));
    expect(window?.closest('[inert]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(40));
    view.rerender(panel());
    expect(document.querySelector('.aca-console')).toBe(window);
    expect(window?.closest('[inert]')).toBeNull();
    expect(body).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Ultimo comando' })).toBeInTheDocument();
  });

  it('clears a retained swipe offset and recovery timer when the same window reopens', () => {
    const view = render(panel());
    const window = document.querySelector('.aca-console');
    const header = document.querySelector('.aca-console__header')!;
    const sheet = document.querySelector<HTMLElement>('.aca-console__sheet')!;
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    fireEvent.pointerDown(header, { pointerId: 3, isPrimary: true, clientY: 50 });
    fireEvent.pointerMove(header, { pointerId: 3, isPrimary: true, clientY: 350 });
    now.mockReturnValue(1400);
    fireEvent.pointerUp(header, { pointerId: 3, isPrimary: true, clientY: 350 });
    expect(sheet.style.transform).toMatch(/^translateY\(/);
    view.rerender(panel(false));
    act(() => vi.advanceTimersByTime(40));
    view.rerender(panel());
    expect(document.querySelector('.aca-console')).toBe(window);
    expect(sheet.style.transform).toBe('');
    expect(sheet.style.transition).toContain('220ms');
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an early close retains only an inert exit, then removes it without a late content timer', () => {
    const view = render(panel());
    act(() => vi.advanceTimersByTime(40));
    view.rerender(panel(false));
    act(() => vi.advanceTimersByTime(90));
    expect(document.querySelector('.aca-console')?.closest('[inert]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(110));
    expect(document.querySelector('.aca-console')).toBeNull();
    act(() => vi.runOnlyPendingTimers());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses immediate content and retains the short exit fade with reduced motion', () => {
    motion(true, true);
    const view = render(panel());
    expect(document.querySelector('.aca-console__body')).not.toHaveAttribute('inert');
    expect(document.querySelector('.aca-console')?.getAttribute('style') ?? '').not.toContain('transform');
    view.rerender(panel(false));
    act(() => vi.advanceTimersByTime(119));
    expect(document.querySelector('.aca-console')).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(document.querySelector('.aca-console')).toBeNull();
  });

  it('does not wait for an unavailable animation API', () => {
    motion(false);
    render(panel());
    expect(document.querySelector('.aca-console__body')).not.toHaveAttribute('inert');
  });

  it('lets a nested plain popover consume the first Escape before closing the widget screen', () => {
    motion(false);
    const close = vi.fn();
    render(<Console open title="Widget" onClose={close}>
      <Popover label="Modalità" trigger={(props) => <Button {...props}>Apri menu</Button>}>
        <button>Opzione</button>
      </Popover>
    </Console>);
    const trigger = screen.getByRole('button', { name: 'Apri menu' });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Opzione' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Opzione' })).toBeNull();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('existing detail content in the common widget screen', () => {
  it('keeps the light device header, controls and bounded scrolling content without issuing a command', () => {
    motion(false);
    const callService = vi.fn(async () => undefined);
    renderWithRuntime(<WidgetConsole target={{ widgetId: 'light.soggiorno', pageId: 'home', settingsKey: 'home::light.soggiorno',
      title: 'Soggiorno', settings: { categoryWidgetType: 'light' } }} onClose={() => undefined} />, {
      callService, entities: fixtureEntities([fixtureEntity('light.soggiorno', 'on', { friendly_name: 'Soggiorno', brightness: 128, supported_color_modes: ['brightness'] })]),
    });
    expect(document.querySelector('.aca-console-column .widget-console-details .aca-adaptive-widget[data-details]')).not.toBeNull();
    expect(screen.getByRole('slider', { name: /Luminosità di/ })).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });

  it('keeps alarm PIN/permissions content without adding the excluded adaptive header', () => {
    motion(false);
    const callService = vi.fn(async () => undefined);
    renderWithRuntime(<WidgetConsole target={{ widgetId: 'alarm_card_1', pageId: 'home', settingsKey: 'home::alarm_card_1', title: 'Allarme',
      settings: { categoryWidgetType: 'alarm', alarmId: 'alarm_control_panel.casa' } }} onClose={() => undefined} />, {
      callService, entities: fixtureEntities([fixtureEntity('alarm_control_panel.casa', 'disarmed', {
        friendly_name: 'Casa', supported_features: 1 + 2 + 4, code_format: 'number', code_arm_required: true,
      })]),
    });
    expect(document.querySelector('.aca-console-column .widget-console-details')).not.toBeNull();
    expect(document.querySelector('.aca-adaptive-widget')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Inserisci in casa/ }));
    expect(screen.getByLabelText('PIN')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
});
