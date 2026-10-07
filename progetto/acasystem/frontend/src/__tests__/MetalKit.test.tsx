import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Field,
  ProgressRing,
  Segmented,
  SelectTrigger,
  Slider,
  Surface,
  Text,
  Toggle,
} from '@/components/primitives';

const layers = (root: Element) => {
  const outer = root.firstElementChild;
  const face = outer?.firstElementChild;
  const content = face?.firstElementChild;
  return { outer, face, content };
};

describe('materiale a quattro livelli', () => {
  it('Button annida socket, guscio, faccia e contenuto e incide il testo', () => {
    render(
      <Button variant="control" className="extra" contentClassName="gap-3">
        Riposo
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Riposo' });
    expect(button).toHaveClass('aca-m', 'aca-m--press', 'aca-m--pill', 'aca-m--sm', 'extra');
    const { outer, face, content } = layers(button);
    expect(outer).toHaveClass('aca-m__outer');
    expect(face).toHaveClass('aca-m__face');
    expect(content).toHaveClass('aca-m__content', 'gap-3');
    expect(screen.getByText('Riposo')).toHaveClass('aca-m__label');
  });

  it('mantiene la variante plain senza materiale', () => {
    render(<Button className="legacy">Plain</Button>);
    const button = screen.getByRole('button', { name: 'Plain' });
    expect(button).toHaveClass('legacy');
    expect(button).not.toHaveClass('aca-m');
    expect(button.firstElementChild).toBeNull();
  });

  it('distingue primario e secondario senza colore', () => {
    render(
      <>
        <Button variant="primary">Principale</Button>
        <Button variant="secondary">Secondaria</Button>
      </>
    );
    expect(screen.getByRole('button', { name: 'Principale' })).toHaveClass(
      'aca-m--primary',
      'aca-m--lg'
    );
    expect(screen.getByRole('button', { name: 'Secondaria' })).toHaveClass('aca-m--quiet');
  });

  it('Surface usa livelli div con comportamento e forma', () => {
    const { container } = render(
      <Surface behavior="well" shape="rounded" contentClassName="p-2">
        <p>contenuto</p>
      </Surface>
    );
    const root = container.firstElementChild as Element;
    expect(root.tagName).toBe('DIV');
    expect(root).toHaveClass('aca-m', 'aca-m--well', 'aca-m--rounded');
    expect(layers(root).content?.tagName).toBe('DIV');
    expect(layers(root).content).toHaveClass('p-2');
  });
});

describe('componenti del kit', () => {
  it('Toggle espone role switch e cambia stato', () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Toggle checked={on} onClick={() => setOn((v) => !v)} aria-label="Alimentazione" />;
    }
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Alimentazione' });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle.querySelector('.aca-toggle__knob')).toHaveClass('aca-m--hosted');
  });

  it('Segmented comunica la selezione con aria-pressed', () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Periodo"
        value="week"
        onChange={onChange}
        options={[
          { value: 'week', label: 'Questa settimana' },
          { value: 'month', label: 'Questo mese' },
        ]}
      />
    );
    expect(screen.getByRole('group', { name: 'Periodo' })).toHaveClass('aca-m--well');
    expect(screen.getByRole('button', { name: 'Questa settimana' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Questo mese' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('Field associa la label all’input', () => {
    const onChange = vi.fn();
    render(<Field label="Cerca" icon="search" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Cerca');
    fireEvent.change(input, { target: { value: 'luce' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('Slider usa un range nativo con valore leggibile', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <Slider value={40} onValueChange={onValueChange} label="Acconto" valueText="40%" />
    );
    const slider = screen.getByRole('slider', { name: 'Acconto' });
    expect(slider).toHaveAttribute('aria-valuetext', '40%');
    fireEvent.change(slider, { target: { value: '55' } });
    expect(onValueChange).toHaveBeenCalledWith(55);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--aca-ratio')).toBe(
      '0.4'
    );
  });

  it('ProgressRing espone progressbar e valore', () => {
    render(
      <ProgressRing value={65} label="Attività">
        23k
      </ProgressRing>
    );
    const ring = screen.getByRole('progressbar', { name: 'Attività' });
    expect(ring).toHaveAttribute('aria-valuenow', '65');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('SelectTrigger dichiara il menu e il suo stato', () => {
    render(<SelectTrigger label="Menu a tendina" expanded />);
    const trigger = screen.getByRole('button', { name: 'Menu a tendina' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('Badge è decorativo e Text applica il tono', () => {
    const { container } = render(
      <>
        <Badge />
        <Text tone="engraved">inciso</Text>
      </>
    );
    expect(container.querySelector('.aca-badge')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('inciso')).toHaveClass('aca-ink--engraved');
  });
});
