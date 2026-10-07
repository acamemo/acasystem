import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Body,
  Caption,
  Display,
  Heading,
  Icon,
  IconText,
  Label,
  Numeric,
  Text,
  Title,
} from '@/components/primitives';

describe('primitive tipografiche', () => {
  it('Display usa la scala display e il tag scelto', () => {
    render(
      <Display as="time" size="lg" dateTime="18:42">
        18:42
      </Display>
    );
    const display = screen.getByText('18:42');
    expect(display.tagName).toBe('TIME');
    expect(display).toHaveAttribute('datetime', '18:42');
    expect(display).toHaveClass('aca-type', 'aca-type--display-lg');
  });

  it('Title è un titolo del livello richiesto', () => {
    render(<Title level={2}>Soggiorno</Title>);
    const title = screen.getByRole('heading', { level: 2, name: 'Soggiorno' });
    expect(title).toHaveClass('aca-type--title');
  });

  it('Heading resta compatibile e aggiunge la scala solo se richiesta', () => {
    render(
      <>
        <Heading level={3} className="legacy-title" tone="muted">
          Vecchio
        </Heading>
        <Heading level={3} size="md">
          Nuovo
        </Heading>
      </>
    );
    const legacy = screen.getByRole('heading', { name: 'Vecchio' });
    expect(legacy.className).toBe('aca-ink--muted legacy-title');
    expect(screen.getByRole('heading', { name: 'Nuovo' })).toHaveClass(
      'aca-type',
      'aca-type--heading-md'
    );
  });

  it('Text resta invariato per il codice esistente', () => {
    render(
      <Text as="p" tone="engraved" className="x">
        inciso
      </Text>
    );
    const text = screen.getByText('inciso');
    expect(text.tagName).toBe('P');
    expect(text.className).toBe('aca-ink--engraved x');
  });

  it('Body, Caption e Label applicano scala e tono', () => {
    render(
      <>
        <Body size="sm" tone="info">
          Informazione
        </Body>
        <Caption>Didascalia</Caption>
        <Label as="label" htmlFor="campo" size="sm">
          Etichetta
        </Label>
        <input id="campo" />
      </>
    );
    expect(screen.getByText('Informazione')).toHaveClass('aca-type--body-sm', 'aca-ink--info');
    expect(screen.getByText('Didascalia')).toHaveClass('aca-type--caption', 'aca-ink--muted');
    const label = screen.getByText('Etichetta');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('aca-m__label', 'aca-type--label-sm');
    expect(screen.getByLabelText('Etichetta')).toHaveAttribute('id', 'campo');
  });

  it('Numeric tiene le cifre tabellari su una riga', () => {
    render(
      <Numeric as="data" value="8989.3">
        8.989,30 €
      </Numeric>
    );
    const figure = screen.getByText('8.989,30 €');
    expect(figure.tagName).toBe('DATA');
    expect(figure).toHaveAttribute('value', '8989.3');
    expect(figure).toHaveClass('aca-numeric');
  });

  it('IconText rende l’icona decorativa e il testo portatore di significato', () => {
    const { container } = render(
      <IconText icon="warning" iconTone="danger" iconSize="lg" tone="danger">
        Sensore non raggiungibile
      </IconText>
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('aca-icon-text', 'aca-ink--danger');
    const svg = root.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('aca-icon', 'aca-icon--lg');
    expect(svg?.getAttribute('style')).toContain('var(--aca-danger-ink-icon)');
    expect(root).toHaveTextContent('Sensore non raggiungibile');
  });

  it('Icon accetta le dimensioni della scala e i pixel come prima', () => {
    const { container } = render(
      <>
        <Icon name="bell" size="sm" />
        <Icon name="bell" size={20} className="legacy" />
      </>
    );
    const [scaled, pixels] = Array.from(container.querySelectorAll('svg'));
    expect(scaled).toHaveClass('aca-icon', 'aca-icon--sm');
    expect(pixels).toHaveAttribute('width', '20');
    expect(pixels).toHaveClass('legacy');
    expect(pixels).not.toHaveClass('aca-icon');
  });
});
