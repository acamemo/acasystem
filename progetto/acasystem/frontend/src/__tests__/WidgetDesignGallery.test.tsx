import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WidgetDesignGallery, { DESIGN_WIDGET_TYPES } from '@/pages/ui-kit/WidgetDesignGallery';
import { WIDGET_CATEGORIES } from '@/templates/sheets/catalog';

describe('widget design gallery', () => {
  it('shows a populated design for every remaining widget, excluding the existing cover designs, without duplicates', () => {
    const { container } = render(<WidgetDesignGallery />);
    const specimens = [...container.querySelectorAll('[data-design-type]')];
    expect(specimens.map((element) => element.getAttribute('data-design-type')).sort()).toEqual(
      DESIGN_WIDGET_TYPES.map((item) => item.type).sort()
    );
    for (const specimen of specimens) {
      expect(specimen.querySelector('.uikw-card__body')?.childElementCount).toBeGreaterThan(0);
      expect(specimen.querySelectorAll('.uikwa-chart')).toHaveLength(1);
      expect(
        within(specimen as HTMLElement).getByRole('img', { name: /Visualizzazione simulata/ })
      ).toBeInTheDocument();
    }
    expect(container.querySelector('[data-design-type=cover_clock]')).toBeNull();
    expect(container.querySelector('[data-design-type=calendar]')).toBeNull();
    expect(container.querySelector('[data-design-type=weather]')).toBeNull();
    expect(screen.getByText(/senza collegare dispositivi/)).toBeInTheDocument();
  });

  it('updates the chart from the same local value as the gesture without changing the selected controls', () => {
    const { container } = render(<WidgetDesignGallery />);
    const card = container.querySelector('[data-design-type="light"]') as HTMLElement;
    const knob = within(card).getByRole('slider', { name: 'Luminosità della luce' });
    fireEvent.keyDown(knob, { key: 'End' });
    expect(card.querySelector('.uikwa-chart')).toHaveAttribute('data-chart-value', '100');
    expect(within(card).getByRole('img', { name: /Luminosità: 100 %/ })).toBeInTheDocument();
    fireEvent.change(within(card).getByRole('combobox'), { target: { value: 'page' } });
    expect(card.querySelectorAll('.uikwa-chart')).toHaveLength(1);
    expect(card.querySelector('.uikwa-chart')).toHaveAttribute('data-chart-value', '100');
  });

  it('filters by the existing categories and returns to the full catalog', () => {
    const { container } = render(<WidgetDesignGallery />);
    const filters = within(screen.getByRole('group', { name: 'Categorie dei design' }));
    for (const category of WIDGET_CATEGORIES) {
      const expected = DESIGN_WIDGET_TYPES.filter((item) =>
        (category.types as readonly string[]).includes(item.type)
      );
      fireEvent.click(filters.getByRole('button', { name: category.label }));
      expect(
        [...container.querySelectorAll('[data-design-type]')]
          .map((element) => element.getAttribute('data-design-type'))
          .sort()
      ).toEqual(expected.map((item) => item.type).sort());
    }
    fireEvent.click(filters.getByRole('button', { name: 'Tutti' }));
    expect(container.querySelectorAll('[data-design-type]')).toHaveLength(
      DESIGN_WIDGET_TYPES.length
    );
  });

  it('keeps gestures and detail sliders in sync and restores values after filtering', () => {
    const { container } = render(<WidgetDesignGallery />);
    const light = within(container.querySelector('[data-design-type="light"]') as HTMLElement);
    const knob = light.getByRole('slider', { name: 'Luminosità della luce' });
    fireEvent.keyDown(knob, { key: 'ArrowDown', shiftKey: true });
    expect(knob).toHaveAttribute('aria-valuenow', '55');
    fireEvent.click(light.getByRole('button', { name: 'Dettagli' }));
    const details = within(screen.getByRole('dialog'));
    const slider = details.getByRole('slider', { name: 'Luminosità della luce · cursore' });
    expect(slider).toHaveValue('55');
    fireEvent.change(slider, { target: { value: '42' } });
    fireEvent.click(details.getByRole('button', { name: 'Chiudi' }));
    expect(knob).toHaveAttribute('aria-valuenow', '42');
    const filters = within(screen.getByRole('group', { name: 'Categorie dei design' }));
    fireEvent.click(filters.getByRole('button', { name: 'Sicurezza' }));
    fireEvent.click(filters.getByRole('button', { name: 'Tutti' }));
    expect(
      within(container.querySelector('[data-design-type="light"]') as HTMLElement).getByRole(
        'slider',
        { name: 'Luminosità della luce' }
      )
    ).toHaveAttribute('aria-valuenow', '42');
  });

  it('cancels drafts, saves visibility and retains all compatible controls in details', () => {
    const { container } = render(<WidgetDesignGallery />);
    const light = within(container.querySelector('[data-design-type="light"]') as HTMLElement);
    fireEvent.click(light.getByRole('button', { name: 'Dettagli' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configura widget' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Mostra Colore della luce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(light.getByRole('slider', { name: 'Colore della luce' })).toBeInTheDocument();
    fireEvent.click(light.getByRole('button', { name: 'Dettagli' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configura widget' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Mostra Colore della luce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('slider', { name: 'Colore della luce' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    fireEvent.change(light.getByRole('combobox'), { target: { value: 'page' } });
    expect(light.queryByRole('slider', { name: 'Colore della luce' })).toBeNull();
  });

  it('switches capabilities only on save and blocks unavailable controls', () => {
    const { container } = render(<WidgetDesignGallery />);
    const light = within(container.querySelector('[data-design-type="light"]') as HTMLElement);
    fireEvent.click(light.getByRole('button', { name: 'Dettagli' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configura widget' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Dispositivo simulato' }), {
      target: { value: 'white' },
    });
    expect(screen.queryByRole('switch', { name: 'Mostra Colore della luce' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    expect(
      within(screen.getByRole('dialog')).queryByRole('slider', { name: 'Colore della luce' })
    ).toBeNull();
    expect(
      within(screen.getByRole('dialog')).getByRole('slider', { name: 'Temperatura del bianco' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Non disponibile' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('slider', { name: 'Luminosità della luce' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(light.getByRole('slider', { name: 'Luminosità della luce' })).toBeDisabled();
  });

  it('applies the saved order even at page size', () => {
    const { container } = render(<WidgetDesignGallery />);
    const article = container.querySelector('[data-design-type="light"]') as HTMLElement;
    const light = within(article);
    fireEvent.click(light.getByRole('button', { name: 'Dettagli' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configura widget' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta su Accensione luce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta su Accensione luce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    fireEvent.change(light.getByRole('combobox'), { target: { value: 'page' } });
    expect(
      [...article.querySelectorAll('.uikwa-controls [data-control-id]')].map((element) =>
        element.getAttribute('data-control-id')
      )
    ).toEqual(['power', 'brightness', 'hue']);
  });

  it('edits tasks locally and gates security actions with an unsaved demonstration PIN', () => {
    const { container } = render(<WidgetDesignGallery />);
    const todo = within(container.querySelector('[data-design-type="todo"]') as HTMLElement);
    fireEvent.click(todo.getByRole('button', { name: 'Dettagli' }));
    fireEvent.change(screen.getByLabelText('Nome attività'), {
      target: { value: 'Controllare ingresso' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi attività' }));
    expect(
      screen.getByRole('button', { name: 'Elimina Controllare ingresso' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina Controllare ingresso' }));
    expect(screen.queryByRole('button', { name: 'Elimina Controllare ingresso' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    const alarm = within(container.querySelector('[data-design-type="alarm"]') as HTMLElement);
    fireEvent.click(alarm.getByRole('button', { name: 'Dettagli' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Notte' })
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('PIN del dispositivo simulato'), {
      target: { value: '1234' },
    });
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Notte' })
    ).not.toBeDisabled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Notte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    fireEvent.click(alarm.getByRole('button', { name: 'Dettagli' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Notte' })
    ).toBeDisabled();
  });
});
