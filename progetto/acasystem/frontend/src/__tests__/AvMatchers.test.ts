import { describe, expect, it } from 'vitest';
import { mediaPages, mediaWidgets } from '@/components/widgets/media';
import { MEDIA_FEATURE, mediaCapabilities } from '@/components/widgets/media/model/features';
import {
  applyGo2rtcMode,
  getCameraSourcePlan,
  normalizeCameraStreamEngine,
  resolveCameraTemplate,
} from '@/components/widgets/media/model/camera';
import { nextRepeatMode, resolveImage } from '@/components/widgets/media/model/entity';
import { normalizeChoices } from '@/components/widgets/media/model/choices';

const typeOf = (id: string, settings: Record<string, unknown> = {}) =>
  mediaWidgets.filter((definition) => definition.matches(id, settings)).map((d) => d.type);

describe('matcher dei widget multimediali (prefissi del CARD_REGISTRY legacy)', () => {
  it('riconosce ogni prefisso con una sola definizione', () => {
    expect(typeOf('media_player.cucina')).toEqual(['mediaPlayer']);
    expect(typeOf('media_group_1')).toEqual(['mediaGroup']);
    expect(typeOf('sonos_group_2')).toEqual(['mediaGroup']);
    expect(typeOf('androidtv_card_1')).toEqual(['androidTv']);
    expect(typeOf('appletv_card_3')).toEqual(['appleTv']);
    expect(typeOf('camera_card_4')).toEqual(['camera']);
  });

  it('il prefisso media_player vince sulle impostazioni generiche, come nel registro legacy', () => {
    expect(typeOf('media_player.tv', { type: 'sensor' })).toEqual(['mediaPlayer']);
  });

  it('non prende id di altri gruppi', () => {
    for (const id of ['light.sala', 'camera.ingresso', 'media_player', 'entity_card_1', 'climate_card_1']) {
      expect(typeOf(id)).toEqual([]);
    }
  });

  it('dimensioni coerenti: default tra minimo e massimo', () => {
    for (const { sizes, type } of mediaWidgets) {
      expect(sizes.min.w, type).toBeLessThanOrEqual(sizes.default.w);
      expect(sizes.min.h, type).toBeLessThanOrEqual(sizes.default.h);
      expect(sizes.default.w, type).toBeLessThanOrEqual(sizes.max.w);
      expect(sizes.default.h, type).toBeLessThanOrEqual(sizes.max.h);
    }
    expect(mediaWidgets.find((d) => d.type === 'camera')?.sizes.max).toEqual({ w: 4, h: 4 });
  });

  it('registra le pagine media e sonos', () => {
    expect(mediaPages.map((page) => page.kind)).toEqual(['media', 'sonos']);
  });
});

describe('modello', () => {
  it('le funzioni seguono supported_features, tutte disponibili quando manca', () => {
    expect(mediaCapabilities({ attributes: {} }).next).toBe(true);
    const caps = mediaCapabilities({
      attributes: { supported_features: MEDIA_FEATURE.PAUSE | MEDIA_FEATURE.VOLUME_SET },
    });
    expect(caps.playPause).toBe(true);
    expect(caps.volumeSet).toBe(true);
    expect(caps.next).toBe(false);
    expect(caps.shuffle).toBe(false);
  });

  it('ripetizione nel ciclo legacy off → one → all', () => {
    expect(nextRepeatMode('off')).toBe('one');
    expect(nextRepeatMode('one')).toBe('all');
    expect(nextRepeatMode('all')).toBe('off');
    expect(nextRepeatMode('strano')).toBe('off');
  });

  it('immagini: percorsi HA risolti, URL assoluti e inline mantenuti, altri schemi scartati', () => {
    const url = (path?: string | null) => (path ? `http://ha.local${path}` : null);
    expect(resolveImage('/api/media_player_proxy/media_player.x', url)).toBe(
      'http://ha.local/api/media_player_proxy/media_player.x'
    );
    expect(resolveImage('https://cdn.simpleicons.org/plex', url)).toBe('https://cdn.simpleicons.org/plex');
    expect(resolveImage('data:image/svg+xml;base64,AAA', url)).toBe('data:image/svg+xml;base64,AAA');
    expect(resolveImage('javascript:alert(1)', () => 'javascript:alert(1)')).toBeNull();
    expect(resolveImage(undefined, url)).toBeNull();
  });

  it('normalizza preferiti e playlist togliendo i doppioni', () => {
    const choices = normalizeChoices(
      ['spotify:playlist:1', { title: 'Radio', media_content_id: 'radio:1', media_content_type: 'music' }, 'spotify:playlist:1'],
      'music'
    );
    expect(choices).toEqual([
      { id: 'spotify:playlist:1', label: 'spotify:playlist:1', type: 'music', source: 'Spotify', image: null },
      { id: 'radio:1', label: 'Radio', type: 'music', source: 'Radio', image: null },
    ]);
  });

  it('piano delle sorgenti della videocamera identico al legacy', () => {
    const base = { customPlayerUrl: '', hasConnection: true, hasAccessToken: true };
    expect(getCameraSourcePlan({ ...base, engine: 'auto', frontendStreamTypes: ['web_rtc', 'hls'] })).toEqual([
      'webrtc',
      'hls',
      'mjpeg',
      'snapshot',
    ]);
    expect(
      getCameraSourcePlan({
        ...base,
        engine: 'auto',
        frontendStreamTypes: ['web_rtc', 'hls'],
        customPlayerUrl: 'https://go2rtc.local/stream.html?src=front',
      })
    ).toEqual(['custom', 'webrtc', 'hls', 'mjpeg', 'snapshot']);
    expect(
      getCameraSourcePlan({ ...base, engine: 'auto', frontendStreamTypes: null, hasAccessToken: false })
    ).toEqual(['hls', 'snapshot']);
    expect(getCameraSourcePlan({ ...base, engine: 'snapshot', frontendStreamTypes: ['hls'] })).toEqual([
      'snapshot',
    ]);
    expect(normalizeCameraStreamEngine('HA-STREAM')).toBe('ha');
    expect(normalizeCameraStreamEngine('mse')).toBe('go2rtc');
    expect(resolveCameraTemplate('https://g.local/s?src={entity_object_id}', 'camera.porta')).toBe(
      'https://g.local/s?src=porta'
    );
    expect(applyGo2rtcMode('https://g.local/s?src=a&mode=webrtc#p', 'auto')).toBe('https://g.local/s?src=a#p');
  });
});
