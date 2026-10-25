import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GestureControl, type RangeCapability } from '@/pages/ui-kit/GestureControl';
import { profilesFor } from '@/pages/ui-kit/widgetDesignModel';

const range = (id: string) =>
  profilesFor('light')[0]!.capabilities.find((cap) => cap.id === id) as RangeCapability;
beforeEach(() => {
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
  );
});
afterEach(() => vi.unstubAllGlobals());
function Harness({
  id = 'brightness',
  disabled = false,
  onTap = () => {},
}: {
  id?: string;
  disabled?: boolean;
  onTap?: () => void;
}) {
  const cap = range(id);
  const [value, setValue] = useState(cap.initial);
  return (
    <div onClick={onTap}>
      <GestureControl capability={cap} value={value} onChange={setValue} disabled={disabled} />
    </div>
  );
}
const pointer = (
  button: HTMLElement,
  type: 'down' | 'move' | 'up' | 'cancel',
  y: number,
  pointerId = 1
) => {
  const init = { clientY: y, pointerId, button: 0 };
  if (type === 'down') fireEvent.pointerDown(button, init);
  if (type === 'move') fireEvent.pointerMove(button, init);
  if (type === 'up') fireEvent.pointerUp(button, init);
  if (type === 'cancel') fireEvent.pointerCancel(button, init);
};
describe('kit gesture control', () => {
  it('ignores movement below six pixels, previews upwards, clamps and suppresses the following click', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    const knob = screen.getByRole('slider');
    pointer(knob, 'down', 300);
    pointer(knob, 'move', 295);
    expect(knob).toHaveAttribute('aria-valuenow', '65');
    pointer(knob, 'move', 220);
    expect(knob).toHaveAttribute('aria-valuenow', '100');
    pointer(knob, 'up', 220);
    fireEvent.click(knob);
    expect(onTap).not.toHaveBeenCalled();
  });
  it('moves down and restores the initial value on cancellation or capture loss', () => {
    render(<Harness />);
    const knob = screen.getByRole('slider');
    pointer(knob, 'down', 300);
    pointer(knob, 'move', 340);
    expect(knob).toHaveAttribute('aria-valuenow', '40');
    pointer(knob, 'cancel', 340);
    expect(knob).toHaveAttribute('aria-valuenow', '65');
    pointer(knob, 'down', 300);
    pointer(knob, 'move', 340);
    fireEvent.lostPointerCapture(knob, { pointerId: 1 });
    expect(knob).toHaveAttribute('aria-valuenow', '65');
  });
  it('cycles hue independently, rejects another pointer and supports keyboard limits', () => {
    render(<Harness id="hue" />);
    const knob = screen.getByRole('slider');
    pointer(knob, 'down', 300);
    pointer(knob, 'move', 220, 2);
    expect(knob).toHaveAttribute('aria-valuenow', '250');
    pointer(knob, 'move', 220);
    pointer(knob, 'up', 220);
    expect(knob).toHaveAttribute('aria-valuenow', '70');
    fireEvent.keyDown(knob, { key: 'End' });
    expect(knob).toHaveAttribute('aria-valuenow', '359');
    fireEvent.keyDown(knob, { key: 'ArrowUp' });
    expect(knob).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(knob, { key: 'ArrowDown' });
    expect(knob).toHaveAttribute('aria-valuenow', '359');
  });
  it('blocks gestures on an unavailable device', () => {
    render(<Harness disabled />);
    const knob = screen.getByRole('slider');
    pointer(knob, 'down', 300);
    pointer(knob, 'move', 220);
    pointer(knob, 'up', 220);
    expect(knob).toHaveAttribute('aria-valuenow', '65');
    expect(knob).toBeDisabled();
  });

  describe('connessione gesti-servizi HA (ISSUE-064 / Fase 2)', () => {
    it('non duplica al rilascio il valore già inviato durante il trascinamento', () => {
      const onCommit = vi.fn();
      const cap = range('brightness');
      render(
        <GestureControl capability={cap} value={50} onChange={() => {}} onCommit={onCommit} />
      );
      const knob = screen.getByRole('slider');

      pointer(knob, 'down', 300);
      pointer(knob, 'move', 220); // travel 80px -> +50% -> 100%
      pointer(knob, 'up', 220);

      expect(onCommit).toHaveBeenCalledExactlyOnceWith(100, 'move');
    });

    it('cancella onCommit se il gesto viene annullato', () => {
      const onCommit = vi.fn();
      const cap = range('brightness');
      render(
        <GestureControl capability={cap} value={50} onChange={() => {}} onCommit={onCommit} />
      );
      const knob = screen.getByRole('slider');

      pointer(knob, 'down', 300);
      pointer(knob, 'move', 220);
      pointer(knob, 'cancel', 220);

      expect(onCommit).not.toHaveBeenCalledWith(expect.anything(), 'end');
    });

    it('invia onCommit immediato alla pressione dei tasti freccia', () => {
      const onCommit = vi.fn();
      const cap = range('brightness');
      render(
        <GestureControl capability={cap} value={50} onChange={() => {}} onCommit={onCommit} />
      );
      const knob = screen.getByRole('slider');

      fireEvent.keyDown(knob, { key: 'ArrowUp' });
      expect(onCommit).toHaveBeenCalledWith(51, 'end');
    });
  });
});
