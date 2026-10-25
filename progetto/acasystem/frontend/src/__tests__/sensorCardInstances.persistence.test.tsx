import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';

const wrapper = ({ children }: { children?: ReactNode }) => <PageProvider>{children}</PageProvider>;

describe('sensor card instance persistence', () => {
  beforeEach(() => localStorage.clear());

  it('preserves independent names, icons and actions through a profile roundtrip', async () => {
    const cardIds = ['scene.night', 'entity_card_first', 'entity_card_second'];
    const pagesConfig = { header: [], pages: ['home'], home: cardIds };
    localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::scene.night': { type: 'sensor', size: 'small' },
        'home::entity_card_first': { type: 'sensor', entityId: 'scene.night', size: 'large' },
        'home::entity_card_second': { type: 'sensor', entityId: 'scene.night', size: 'large' },
      })
    );
    const first = renderHook(() => usePages(), { wrapper });
    act(() => {
      first.result.current.saveCardSetting('home::entity_card_first', 'sensorAction', {
        type: 'scene',
        label: 'Night lights',
      });
      first.result.current.saveCardSetting('home::entity_card_second', 'sensorAction', {
        type: 'scene',
        label: 'Activate again',
      });
      first.result.current.saveCustomName('entity_card_first', 'Bedtime');
      first.result.current.saveCustomName('entity_card_second', 'Hall');
      first.result.current.saveCustomIcon('entity_card_first', 'Moon');
    });
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('tunet_card_settings') || '{}')['home::entity_card_first']
          .sensorAction.label
      ).toBe('Night lights')
    );
    const snapshot = collectSnapshot();
    first.unmount();
    localStorage.clear();
    applySnapshot(snapshot);
    const restored = renderHook(() => usePages(), { wrapper });
    expect(restored.result.current.pagesConfig.home).toEqual(cardIds);
    expect(
      restored.result.current.cardSettings['home::entity_card_first'].sensorAction
    ).toMatchObject({
      label: 'Night lights',
    });
    expect(
      restored.result.current.cardSettings['home::entity_card_second'].sensorAction
    ).toMatchObject({
      label: 'Activate again',
    });
    expect(restored.result.current.cardSettings['home::scene.night']).toEqual({
      type: 'sensor',
      size: 'small',
    });
    expect(restored.result.current.customNames).toEqual({
      entity_card_first: 'Bedtime',
      entity_card_second: 'Hall',
    });
    expect(restored.result.current.customIcons).toEqual({ entity_card_first: 'Moon' });
  });
});
