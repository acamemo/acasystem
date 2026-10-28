/**
 * Disclosure (REP-20261028-003): the accordion of «Dispositivi trovati». One section open at a
 * time, a tap on the open header closes it, real buttons with `aria-expanded` and `aria-controls`,
 * a closed panel that is inert.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Disclosure, DisclosureGroup } from '@/components/primitives';

afterEach(cleanup);

const group = (props: {
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
}) =>
  render(
    <DisclosureGroup {...props}>
      <Disclosure id="a" title="Prima" count={2}>
        <button type="button">Dentro la prima</button>
      </Disclosure>
      <Disclosure id="b" title="Seconda" count={0}>
        <button type="button">Dentro la seconda</button>
      </Disclosure>
      <Disclosure id="c" title="Terza">
        <p>Testo</p>
      </Disclosure>
    </DisclosureGroup>
  );

const header = (name: string) => screen.getByRole('button', { name });
const panelOf = (name: string) =>
  document.getElementById(header(name).getAttribute('aria-controls') ?? '');

describe('Disclosure', () => {
  it('opens one section at a time: opening one closes the other', () => {
    group({ defaultValue: 'a' });
    expect(header('Prima (2)')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Seconda (0)')).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(header('Seconda (0)'));
    expect(header('Seconda (0)')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Prima (2)')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Terza')).toHaveAttribute('aria-expanded', 'false');
  });

  it('a tap on the open header closes it, and none open is fine', () => {
    const onValueChange = vi.fn();
    group({ defaultValue: 'a', onValueChange });
    fireEvent.click(header('Prima (2)'));
    expect(header('Prima (2)')).toHaveAttribute('aria-expanded', 'false');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(header('Terza'));
    expect(onValueChange).toHaveBeenLastCalledWith('c');
  });

  it('the header is a real button tied to its panel, and a closed panel is inert', () => {
    group({ defaultValue: 'a' });
    const button = header('Prima (2)');
    expect(button.tagName).toBe('BUTTON');
    const panel = panelOf('Prima (2)');
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-labelledby', button.id);
    expect(panel).not.toHaveAttribute('inert');
    expect(panelOf('Seconda (0)')).toHaveAttribute('inert');
    fireEvent.click(header('Seconda (0)'));
    expect(panelOf('Prima (2)')).toHaveAttribute('inert');
    expect(panelOf('Seconda (0)')).not.toHaveAttribute('inert');
  });

  it('works from the keyboard: Enter and Space on the header are a click of a button', () => {
    group({});
    const button = header('Terza');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
