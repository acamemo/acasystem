import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Field, Segmented, Slider, Surface, Toggle } from '@/components/primitives';

describe('stati richiesto, errore, caricamento e disabilitato', () => {
  it('Toggle distingue la richiesta in attesa dal valore confermato', () => {
    const { rerender } = render(<Toggle checked pending aria-label="Luce" />);
    const toggle = screen.getByRole('switch', { name: 'Luce' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    rerender(<Toggle checked aria-label="Luce" />);
    expect(toggle).not.toHaveAttribute('aria-busy');
  });

  it('Toggle in errore espone aria-invalid e un segno sul pomello', () => {
    render(<Toggle checked={false} error aria-label="Luce" aria-describedby="nota" />);
    const toggle = screen.getByRole('switch', { name: 'Luce' });
    expect(toggle).toHaveAttribute('aria-invalid', 'true');
    expect(toggle).toHaveAttribute('aria-describedby', 'nota');
    expect(toggle.querySelector('.aca-toggle__knob .aca-mark')).not.toBeNull();
  });

  it('Toggle usa Acceso/Spento con la sola iniziale maiuscola', () => {
    const { rerender, container } = render(<Toggle checked aria-label="Luce" />);
    expect(container.querySelector('.aca-toggle__label')).toHaveTextContent(/^Acceso$/);
    rerender(<Toggle checked={false} aria-label="Luce" />);
    expect(container.querySelector('.aca-toggle__label')).toHaveTextContent(/^Spento$/);
  });

  it('Slider espone attesa ed errore sul range nativo', () => {
    const { container } = render(
      <Slider value={70} onValueChange={() => {}} label="Luminosità" pending error />
    );
    const slider = screen.getByRole('slider', { name: 'Luminosità' });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    expect(slider).toHaveAttribute('aria-invalid', 'true');
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('aca-slider--pending', 'aca-slider--error');
    expect(root.querySelector('.aca-slider__track')).toHaveClass('aca-m--error');
    expect(root.querySelector('.aca-slider__knob .aca-mark')).not.toBeNull();
  });

  it('Slider disabilitato non accetta input', () => {
    render(<Slider value={40} onValueChange={() => {}} label="Volume" disabled />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeDisabled();
  });

  it('Button in caricamento resta focalizzabile ma ignora i click', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" loading onClick={onClick}>
        Salva
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Salva' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Field in errore collega il messaggio visibile', () => {
    render(<Field label="Nome" error="Usa solo lettere e numeri." aria-describedby="aiuto" />);
    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const message = screen.getByText('Usa solo lettere e numeri.').closest('p') as HTMLElement;
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(['aiuto', message.id]);
    expect(input.closest('.aca-field')).toHaveClass('aca-m--error');
    expect(message.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('Segmented disabilitato blocca tutte le opzioni', () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Vista"
        value="day"
        onChange={onChange}
        disabled
        options={[
          { value: 'day', label: 'Oggi' },
          { value: 'month', label: 'Mese' },
        ]}
      />
    );
    expect(screen.getByRole('group', { name: 'Vista' })).toHaveAttribute('aria-disabled', 'true');
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });

  it('Surface in errore accende il LED senza cambiare il contenuto', () => {
    const { container } = render(
      <Surface error>
        <p>Non disponibile</p>
      </Surface>
    );
    expect(container.firstElementChild).toHaveClass('aca-m', 'aca-m--card', 'aca-m--error');
  });
});
