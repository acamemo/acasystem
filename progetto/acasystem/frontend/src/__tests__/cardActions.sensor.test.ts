import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import { handleAddSelected } from '@/api/cardActions';

/** Configurazione parziale di prova: mancano di proposito `pages` e (spesso) `header`. */
const partialPages = (config: Record<string, string[]>) => config as PagesConfig;

type CtxOverrides = {
  pagesConfig?: PagesConfig;
  cardSettings?: CardSettingsMap;
  addCardTargetPage?: string;
  addCardType?: string;
  selectedEntities?: string[];
};

function makeCtx(overrides: CtxOverrides = {}) {
  return {
    pagesConfig: partialPages({ home: ['scene.night'] }),
    persistConfig: vi.fn(),
    addCardTargetPage: 'home',
    addCardType: 'sensor',
    selectedEntities: ['scene.night'],
    cardSettings: { 'home::scene.night': { type: 'sensor', size: 'small' } } as CardSettingsMap,
    persistCardSettings: vi.fn(),
    getCardSettingsKey: (id: string, page?: string) => `${page}::${id}`,
    setSelectedEntities: vi.fn(),
    setShowAddCardModal: vi.fn(),
    setSelectedWeatherId: vi.fn(),
    setSelectedTempId: vi.fn(),
    setSelectedAndroidTVMediaId: vi.fn(),
    setSelectedAndroidTVRemoteId: vi.fn(),
    setSelectedCostTodayId: vi.fn(),
    setSelectedCostMonthId: vi.fn(),
    setCostSelectionTarget: vi.fn(),
    setSelectedNordpoolId: vi.fn(),
    setNordpoolDecimals: vi.fn(),
    setShowEditCardModal: vi.fn(),
    setEditCardSettingsKey: vi.fn(),
    ...overrides,
  };
}

describe('handleAddSelected sensor card instances', () => {
  afterEach(() => vi.restoreAllMocks());

  it('adds the same entity several times with separate page-scoped settings', () => {
    const first = makeCtx();
    handleAddSelected(first);
    const firstConfig = first.persistConfig.mock.calls[0][0];
    const firstSettings = first.persistCardSettings.mock.calls[0][0];
    const firstId = firstConfig.home[1];
    firstSettings[`home::${firstId}`].sensorAction = { type: 'scene', label: 'Night lights' };

    const second = makeCtx({ pagesConfig: firstConfig, cardSettings: firstSettings });
    handleAddSelected(second);
    const secondConfig = second.persistConfig.mock.calls[0][0];
    const secondSettings = second.persistCardSettings.mock.calls[0][0];
    const secondId = secondConfig.home[2];

    expect(firstId).toMatch(/^entity_card_/);
    expect(secondId).not.toBe(firstId);
    expect(secondConfig.home).toEqual(['scene.night', firstId, secondId]);
    expect(secondSettings[`home::${secondId}`]).toEqual({
      type: 'sensor',
      entityId: 'scene.night',
      size: 'large',
    });
    expect(secondSettings[`home::${firstId}`].sensorAction.label).toBe('Night lights');
    expect(secondSettings['home::scene.night']).toEqual({ type: 'sensor', size: 'small' });
  });

  it('avoids ID collisions within a selection and with cards on other pages', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      'fixed-id' as ReturnType<Crypto['randomUUID']>
    );
    const ctx = makeCtx({
      pagesConfig: partialPages({ home: [], bedroom: ['entity_card_fixed-id'] }),
      selectedEntities: ['sensor.temperature', 'climate.aircondition'],
    });
    handleAddSelected(ctx);
    const config = ctx.persistConfig.mock.calls[0][0];
    expect(config.home).toEqual(['entity_card_fixed-id_1', 'entity_card_fixed-id_2']);
    expect(new Set([...config.home, ...config.bedroom]).size).toBe(3);
  });

  it('keeps entity and toggle cards on their legacy direct-entity path', () => {
    for (const type of ['entity', 'toggle']) {
      const ctx = makeCtx({
        addCardType: type,
        pagesConfig: partialPages({ home: [] }),
        selectedEntities: ['switch.fan'],
      });
      handleAddSelected(ctx);
      expect(ctx.persistConfig).toHaveBeenCalledWith({ home: ['switch.fan'] });
      expect(ctx.persistCardSettings.mock.calls[0][0]['home::switch.fan']).toEqual({
        type,
        size: 'large',
      });
    }
  });

  it('keeps the header on the plain entity path even for a sensor selection', () => {
    const ctx = makeCtx({
      pagesConfig: partialPages({ home: [], header: [] }),
      addCardTargetPage: 'header',
      selectedEntities: ['person.owner'],
    });
    handleAddSelected(ctx);
    expect(ctx.persistConfig).toHaveBeenCalledWith({ home: [], header: ['person.owner'] });
    expect(ctx.persistCardSettings).not.toHaveBeenCalled();
  });
});
