import { describe, expect, it } from 'vitest';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { resolveTv } from '@/components/widgets/media/model/tv';
import {
  ANDROID_TV_APPS,
  isTvInput,
  tvApps,
  tvInputs,
} from '@/components/widgets/media/model/tvApps';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';

/** Apps of the TV details: from the source list, or the documented Android TV deep links. */

const TV = 'media_player.tv';
// `platform` comes from the entity registry (enrichEntitiesWithRegistryMetadata).
const view = (attributes: Record<string, unknown>, platform = '') =>
  resolveTv(
    'android',
    fixtureEntities([fixtureEntity(TV, 'on', platform ? { ...attributes, platform } : attributes)]),
    'c',
    TV,
    [],
    {}
  );

describe('tvApps', () => {
  it('splits the source list into apps and inputs (LG webOS)', () => {
    const lg = view(
      {
        supported_features: MEDIA_FEATURE.SELECT_SOURCE,
        source_list: ['Netflix', 'HDMI 1', 'Prime Video', 'Live TV', 'YouTube', 'AV'],
      },
      'webostv'
    );
    expect(tvApps('android', lg, TV).map((app) => app.name)).toEqual([
      'Netflix',
      'Prime Video',
      'YouTube',
    ]);
    expect(tvInputs('android', lg)).toEqual(['HDMI 1', 'Live TV', 'AV']);
    expect(tvApps('android', lg, TV)[0].call).toEqual({
      domain: 'media_player',
      service: 'select_source',
      data: { entity_id: TV, source: 'Netflix' },
    });
  });

  it('a Samsung that lists only TV and HDMI has no apps', () => {
    const samsung = view({ supported_features: 24381, source_list: ['TV', 'HDMI'] }, 'samsungtv');
    expect(tvApps('android', samsung, TV)).toEqual([]);
    expect(tvInputs('android', samsung)).toEqual(['TV', 'HDMI']);
  });

  it('Android TV remote: the documented apps open with a deep link', () => {
    const android = view({ supported_features: MEDIA_FEATURE.PLAY_MEDIA }, 'androidtv_remote');
    const apps = tvApps('android', android, TV);
    expect(apps.map((app) => app.name)).toEqual(ANDROID_TV_APPS.map((app) => app.name));
    expect(apps[0].call).toEqual({
      domain: 'media_player',
      service: 'play_media',
      data: { entity_id: TV, media_content_type: 'url', media_content_id: 'netflix://' },
    });
  });

  it('another TV with no list and no known platform has no apps', () => {
    expect(tvApps('android', view({ supported_features: 0 }), TV)).toEqual([]);
  });

  it('recognises the inputs', () => {
    for (const input of ['TV', 'HDMI', 'HDMI 2', 'Live TV', 'AV', 'Component', 'USB']) {
      expect(isTvInput(input)).toBe(true);
    }
    for (const app of ['Netflix', 'YouTube', 'Prime Video', 'TVPlayer', 'Disney+']) {
      expect(isTvInput(app)).toBe(false);
    }
  });
});
