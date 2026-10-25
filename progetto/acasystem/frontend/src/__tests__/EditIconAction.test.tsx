import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IconAction,
  TIP_HOVER_MS,
  TIP_LEAVE_MS,
  TIP_LINGER_MAX_MS,
  TIP_LINGER_MS,
  TIP_LINGER_PER_CHAR_MS,
  TIP_PRESS_MS,
} from '@/components/system/edit/IconAction';

/** jsdom builds pointer events without the fields of a finger: pointerId and pointerType. */
class TouchPointer extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(
    type: string,
    options: MouseEventInit & { pointerId?: number; pointerType?: string }
  ) {
    super(type, options);
    this.pointerId = options.pointerId ?? 1;
    this.pointerType = options.pointerType ?? 'touch';
  }
}

const finger = { pointerId: 3, pointerType: 'touch', button: 0, clientX: 20, clientY: 20 };
const mouse = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 };

function renderAction(blocked: string | null = null) {
  const onClick = vi.fn();
  const onBlocked = vi.fn();
  render(
    <>
      <IconAction
        icon="add"
        label="Nuova pagina"
        tip="Nuova pagina vuota"
        blocked={blocked}
        onBlocked={onBlocked}
        onClick={onClick}
      />
      <IconAction
        icon="trash"
        label="Elimina la pagina Casa"
        tip="Elimina la pagina"
        onBlocked={onBlocked}
      />
    </>
  );
  const button = screen.getByRole('button', { name: 'Nuova pagina' });
  return { button, onClick, onBlocked };
}

const tip = () => screen.queryByRole('tooltip');

/** The last input, as the launcher marks it on the root (data-aca-input). */
function lastInput(kind: 'keyboard' | 'pointer') {
  document.documentElement.dataset.acaInput = kind;
}

describe('nuvoletta delle icone dell’editor delle pagine (REP-20261009-002, D5)', () => {
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', TouchPointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.acaInput;
  });

  it('è solo un’icona, con il nome accessibile e senza title', () => {
    const { button } = renderAction();
    expect(button.textContent).toBe('');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(button).not.toHaveAttribute('title');
    expect(tip()).toBeNull();
  });

  it('una pressione lunga col dito mostra la nuvoletta e il rilascio non attiva il pulsante', () => {
    const { button, onClick } = renderAction();
    fireEvent.pointerDown(button, finger);
    act(() => {
      vi.advanceTimersByTime(TIP_PRESS_MS - 1);
    });
    expect(tip()).toBeNull();
    // The menu of a long touch is held back while the finger is on the icon.
    expect(fireEvent.contextMenu(button)).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    expect(button).toHaveAccessibleDescription('Nuova pagina vuota');
    fireEvent.pointerUp(button, finger);
    // The click of the release does nothing, and is cancelled (no popover opened either).
    expect(fireEvent.click(button, { detail: 1 })).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
    // The tip stays a moment after the finger lifts, to be read, as on Android.
    act(() => {
      vi.advanceTimersByTime(TIP_LINGER_MS - 1);
    });
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tip()).toBeNull();
    // The next tap acts as usual.
    fireEvent.pointerDown(button, finger);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    fireEvent.pointerUp(button, finger);
    fireEvent.click(button, { detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tip()).toBeNull();
  });

  it('un dito che si sposta scorre la pagina: niente nuvoletta; il browser che prende il gesto la chiude', () => {
    const { button } = renderAction();
    fireEvent.pointerDown(button, finger);
    fireEvent.pointerMove(button, { ...finger, clientX: 40 });
    act(() => {
      vi.advanceTimersByTime(TIP_PRESS_MS + 100);
    });
    expect(tip()).toBeNull();
    // A small tremor keeps the hold.
    fireEvent.pointerDown(button, finger);
    fireEvent.pointerMove(button, { ...finger, clientX: 26 });
    act(() => {
      vi.advanceTimersByTime(TIP_PRESS_MS);
    });
    expect(tip()).toBeInTheDocument();
    fireEvent.pointerCancel(button, finger);
    expect(tip()).toBeNull();
  });

  it('col mouse appare dopo una breve sosta e sparisce uscendo; il clic agisce', () => {
    const { button, onClick } = renderAction();
    fireEvent.pointerEnter(button, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS - 1);
    });
    expect(tip()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    fireEvent.pointerLeave(button, mouse);
    // A moment to reach the tip: the pointer resting on it keeps it, to be read (WCAG 1.4.13).
    act(() => {
      vi.advanceTimersByTime(TIP_LEAVE_MS - 1);
    });
    fireEvent.pointerEnter(tip() as HTMLElement, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_LEAVE_MS + TIP_HOVER_MS);
    });
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    // A click on the tip is not a click on the icon.
    fireEvent.click(tip() as HTMLElement);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerLeave(tip() as HTMLElement, mouse);
    expect(tip()).toBeNull();
    fireEvent.pointerEnter(button, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS);
    });
    fireEvent.pointerLeave(button, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_LEAVE_MS);
    });
    expect(tip()).toBeNull();
    fireEvent.pointerEnter(button, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS);
    });
    fireEvent.pointerDown(button, mouse);
    expect(tip()).toBeNull();
    fireEvent.click(button, { detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('dalla tastiera appare col fuoco; Esc la chiude senza chiudere altro, così uno scorrimento', () => {
    const { button } = renderAction();
    // A tap focuses the button too: no tip.
    lastInput('pointer');
    act(() => button.focus());
    expect(tip()).toBeNull();
    act(() => button.blur());
    lastInput('keyboard');
    act(() => button.focus());
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    // Esc is held: the launcher would close the page overview too.
    expect(fireEvent.keyDown(window, { key: 'Escape' })).toBe(false);
    expect(tip()).toBeNull();
    expect(button).toHaveFocus();
    act(() => button.blur());
    act(() => button.focus());
    expect(tip()).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(tip()).toBeNull();
    act(() => button.blur());
    act(() => button.focus());
    act(() => button.blur());
    expect(tip()).toBeNull();
    // Without a tip, Esc goes on to the launcher.
    expect(fireEvent.keyDown(window, { key: 'Escape' })).toBe(true);
  });

  it('mostrata mentre la scheda scivola, si riposiziona quando la scheda è arrivata', () => {
    const { button } = renderAction();
    let top = 300;
    vi.spyOn(button, 'getBoundingClientRect').mockImplementation(
      () => ({ top, bottom: top + 44, left: 40, width: 44, height: 44 }) as DOMRect
    );
    lastInput('keyboard');
    act(() => button.focus());
    const panel = tip() as HTMLElement;
    const before = panel.style.top;
    top = 100;
    // Un’altra proprietà che finisce (la dissolvenza di un’icona) la lascia dov’è.
    fireEvent(window, Object.assign(new Event('transitionend'), { propertyName: 'opacity' }));
    expect(panel.style.top).toBe(before);
    fireEvent(window, Object.assign(new Event('transitionend'), { propertyName: 'translate' }));
    expect(panel.style.top).not.toBe(before);
    vi.restoreAllMocks();
  });

  it('il mouse che dalla nuvoletta torna sull’icona non la nasconde (la nuvoletta sale oltre l’icona)', () => {
    const { button } = renderAction();
    fireEvent.pointerEnter(button, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS);
    });
    fireEvent.pointerEnter(tip() as HTMLElement, mouse);
    fireEvent.pointerLeave(tip() as HTMLElement, { ...mouse, relatedTarget: button });
    expect(tip()).not.toBeNull();
    // Away from both, it hides.
    fireEvent.pointerLeave(tip() as HTMLElement, { ...mouse, relatedTarget: document.body });
    expect(tip()).toBeNull();
  });

  it('con l’azione non disponibile mostra anche il motivo, e la pressione lo dice', () => {
    const reason = 'Serve almeno una pagina.';
    const { button, onClick, onBlocked } = renderAction(reason);
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(reason);
    lastInput('keyboard');
    act(() => button.focus());
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    expect(tip()).toHaveTextContent(reason);
    // The reason is in the Body primitive too (16 px).
    expect(tip()?.querySelector('.aca-edit-tip__reason')).toHaveClass('aca-type--body-md');
    fireEvent.click(button);
    expect(onBlocked).toHaveBeenCalledWith(reason);
    expect(onClick).not.toHaveBeenCalled();
    // A long press shows it without telling it again at the release.
    fireEvent.pointerDown(button, finger);
    act(() => {
      vi.advanceTimersByTime(TIP_PRESS_MS);
    });
    expect(tip()).toHaveTextContent(reason);
    fireEvent.pointerUp(button, finger);
    fireEvent.click(button, { detail: 1 });
    expect(onBlocked).toHaveBeenCalledTimes(1);
    // The reason has its time to be read after the finger lifts.
    act(() => {
      vi.advanceTimersByTime(TIP_LINGER_MS + TIP_LINGER_PER_CHAR_MS * reason.length - 1);
    });
    expect(tip()).toHaveTextContent(reason);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tip()).toBeNull();
  });

  it('il motivo lungo resta al massimo TIP_LINGER_MAX_MS dopo il rilascio', () => {
    const { button } = renderAction('x'.repeat(200));
    fireEvent.pointerDown(button, finger);
    act(() => {
      vi.advanceTimersByTime(TIP_PRESS_MS);
    });
    fireEvent.pointerUp(button, finger);
    act(() => {
      vi.advanceTimersByTime(TIP_LINGER_MAX_MS - 1);
    });
    expect(tip()).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tip()).toBeNull();
  });

  it('una nuvoletta alla volta, e nessuna su una barra inerte', () => {
    const { button } = renderAction();
    const trash = screen.getByRole('button', { name: 'Elimina la pagina Casa' });
    lastInput('keyboard');
    act(() => button.focus());
    expect(tip()).toHaveTextContent('Nuova pagina vuota');
    fireEvent.pointerEnter(trash, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS);
    });
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(tip()).toHaveTextContent('Elimina la pagina');
    fireEvent.pointerLeave(trash, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_LEAVE_MS);
    });
    trash.parentElement?.setAttribute('inert', '');
    fireEvent.pointerEnter(trash, mouse);
    act(() => {
      vi.advanceTimersByTime(TIP_HOVER_MS);
    });
    expect(tip()).toBeNull();
  });

  /** The tip placed by hand: jsdom has no layout, so the sizes of the icon and of the bubble are given. */
  function placed(icon: { left: number; top: number }, viewport = 1024) {
    vi.stubGlobal('innerWidth', viewport);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(32);
    const { button } = renderAction();
    const rect = { ...icon, width: 40, height: 40, right: icon.left + 40, bottom: icon.top + 40 };
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    });
    lastInput('keyboard');
    act(() => button.focus());
    return screen.getByRole('tooltip');
  }

  it('la punta della nuvoletta indica l’icona: sopra, al centro; sotto, quando manca lo spazio', () => {
    const above = placed({ left: 200, top: 300 });
    expect(above).toHaveAttribute('data-side', 'above');
    // Centred on the icon: 220 − (220 − 50) = 50 px from the left of the bubble.
    expect(above.style.left).toBe('170px');
    expect(above.style.getPropertyValue('--aca-tip-arrow-x')).toBe('50px');
  });

  it('sotto l’icona quando sopra non c’è posto', () => {
    const below = placed({ left: 200, top: 10 });
    expect(below).toHaveAttribute('data-side', 'below');
    expect(below.style.top).toBe('58px');
  });

  it('contro il bordo la nuvoletta si ferma e la punta continua a indicare l’icona', () => {
    // Icon centre at 24 px, bubble pushed to the 8 px margin: the point is 16 px inside it.
    const left = placed({ left: 4, top: 300 });
    expect(left.style.left).toBe('8px');
    expect(left.style.getPropertyValue('--aca-tip-arrow-x')).toBe('16px');
  });

  it('contro il bordo destro la punta indica l’icona senza uscire dagli angoli arrotondati', () => {
    const right = placed({ left: 980, top: 300 });
    // Bubble at 1024 − 100 − 8 = 916; icon centre 1000 → 84 px, within 100 − 12.
    expect(right.style.left).toBe('916px');
    expect(right.style.getPropertyValue('--aca-tip-arrow-x')).toBe('84px');
  });

  it('il testo usa la primitiva Body a 16 px, senza il tono dell’inchiostro (è bianco sul fondo)', () => {
    const tipEl = placed({ left: 200, top: 300 });
    const text = tipEl.querySelector('.aca-type');
    expect(text).toHaveClass('aca-type--body-md');
    expect(text).not.toHaveClass('aca-ink');
  });

  it('con il movimento ridotto solo dissolvenza; l’aspetto sta nelle variabili --aca-tip-*', async () => {
    vi.useRealTimers();
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const edit = fs
      .readFileSync('src/components/system/edit/edit.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = edit.match(/\.aca-edit-tip \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
    for (const token of ['surface', 'ink', 'shadow', 'radius', 'padding']) {
      expect(rule).toMatch(new RegExp(`--aca-tip-${token}:`));
    }
    expect(rule).toMatch(/pointer-events: none;/);
    // A fine pointer can rest on it (WCAG 1.4.13); a finger goes through.
    expect(edit).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.aca-edit-tip \{\s*pointer-events: auto;/
    );
    expect(rule).toMatch(/z-index: var\(--aca-z-tooltip\);/);
    // The look of UI-010: radius 5 px, the soft shadow, the elastic curve in 300 ms.
    expect(rule).toMatch(/--aca-tip-radius: 5px;/);
    expect(rule).toMatch(/--aca-tip-shadow: 0 10px 10px oklch\(0% 0 0 \/ 10%\);/);
    expect(rule).toMatch(/--aca-tip-curve: cubic-bezier\(0\.68, -0\.55, 0\.265, 1\.55\);/);
    expect(rule).toMatch(/--aca-tip-enter: 300ms;/);
    expect(rule).toMatch(/--aca-tip-arrow: 8px;/);
    // The text: 16 px by the Body primitive, weight 500 here.
    expect(edit).toMatch(
      /\.aca-edit-tip > \.aca-type--body-md \{\s*font-weight: var\(--aca-weight-medium\);/
    );
    expect(edit).toMatch(
      /\.aca-edit-tip \.aca-edit-tip__reason \{\s*font-weight: var\(--aca-weight-regular\);/
    );
    // The pointer: a turned square at --aca-tip-arrow-x, on the other side when the tip hangs below.
    expect(edit).toMatch(
      /\.aca-edit-tip::after \{[^}]*left: var\(--aca-tip-arrow-x, 50%\);[^}]*rotate: 45deg;/
    );
    expect(edit).toMatch(/\.aca-edit-tip\[data-side='below'\]::after \{\s*top: /);
    // Properties named, never `all`; with reduced motion only a 120 ms fade.
    // The block ends at the first rule of the widget bar (the comments are already stripped).
    const tipStart = edit.indexOf('.aca-edit-tip {');
    const tipEnd = edit.indexOf('.aca-widget-actions__divider');
    expect(tipEnd).toBeGreaterThan(tipStart);
    const tipCss = edit.slice(tipStart, tipEnd);
    expect(tipCss).not.toMatch(/transition: all|transition:\s*all/);
    expect(edit).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.aca-edit-tip,\s*\.aca-edit-tip\[data-side='below'\] \{\s*--aca-tip-enter: 120ms;\s*animation-name: aca-tip-fade;\s*animation-timing-function: ease-out;/
    );
  });
});
