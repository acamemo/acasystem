// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  isHomeAssistantProxyUrl,
  matchHomeAssistantProxyRequest,
  matchHomeAssistantWebSocketRequest,
} from '../helpers/homeAssistantProxyPaths.ts';
import { removeIngressPrefix } from '../middlewares/ingressPath.ts';

const isAllowed = (method: string, url: string): boolean =>
  matchHomeAssistantProxyRequest(method, url).allowed;

describe('isHomeAssistantProxyUrl', () => {
  it('claims /ha and everything below it, nothing else', () => {
    expect(isHomeAssistantProxyUrl('/ha')).toBe(true);
    expect(isHomeAssistantProxyUrl('/ha/')).toBe(true);
    expect(isHomeAssistantProxyUrl('/ha?x=1')).toBe(true);
    expect(isHomeAssistantProxyUrl('/ha/auth/token')).toBe(true);
    expect(isHomeAssistantProxyUrl('/hassio/auth/token')).toBe(false);
    expect(isHomeAssistantProxyUrl('/api/health')).toBe(false);
    expect(isHomeAssistantProxyUrl('/HA/auth/token')).toBe(false);
  });
});

describe('matchHomeAssistantProxyRequest', () => {
  it('allows each listed path only with its own method', () => {
    const allowed: [string, string][] = [
      ['GET', '/ha/auth/providers'],
      ['POST', '/ha/auth/login_flow'],
      ['POST', '/ha/auth/login_flow/0123abcd'],
      ['DELETE', '/ha/auth/login_flow/0123abcd'],
      ['POST', '/ha/auth/token'],
      ['POST', '/ha/auth/revoke'],
      ['GET', '/ha/api/camera_proxy/camera.ingresso?token=abc&width=640'],
      ['GET', '/ha/api/camera_proxy_stream/camera.ingresso?token=abc'],
      ['GET', '/ha/api/media_player_proxy/media_player.sala?token=x&cache=1'],
      ['GET', '/ha/api/media_player_proxy/media_player.sala/browse_media/album/123?token=a'],
      ['GET', '/ha/api/media_player_proxy/media_player.sala/browse_media/library/A:ALBUM/x/y'],
      ['GET', '/ha/api/image_proxy/image.mappa?t=0'],
      ['GET', '/ha/api/history/period?filter_entity_id=sensor.a'],
      [
        'GET',
        '/ha/api/history/period/2026-10-07T08:00:00.000Z?filter_entity_id=sensor.a,sensor.b&end_time=2026-10-07T09%3A00%3A00.000Z&minimal_response',
      ],
      ['GET', '/ha/api/hls/abc123/master_playlist.m3u8'],
      ['GET', '/ha/api/hls/abc123/segment/12.m4s'],
    ];
    for (const [method, url] of allowed) {
      expect(isAllowed(method, url), `${method} ${url}`).toBe(true);
    }

    const wrongMethod: [string, string][] = [
      ['POST', '/ha/auth/providers'],
      ['GET', '/ha/auth/login_flow'],
      ['GET', '/ha/auth/login_flow/0123abcd'],
      ['DELETE', '/ha/auth/token'],
      ['GET', '/ha/auth/token'],
      ['POST', '/ha/api/camera_proxy/camera.ingresso'],
      ['POST', '/ha/api/media_player_proxy/media_player.sala/browse_media/album/123'],
      ['DELETE', '/ha/api/media_player_proxy/media_player.sala/browse_media/album/123'],
      ['HEAD', '/ha/api/hls/abc123/master_playlist.m3u8'],
      ['OPTIONS', '/ha/auth/token'],
    ];
    for (const [method, url] of wrongMethod) {
      expect(isAllowed(method, url), `${method} ${url}`).toBe(false);
    }
  });

  it('marks only the start of the login flow for the body check', () => {
    const start = matchHomeAssistantProxyRequest('POST', '/ha/auth/login_flow');
    const step = matchHomeAssistantProxyRequest('POST', '/ha/auth/login_flow/0123abcd');
    expect(start).toMatchObject({ allowed: true, route: { loginAttempt: true, loginFlowStart: true } });
    expect(step).toMatchObject({ allowed: true, route: { loginAttempt: true } });
    expect(step.allowed && step.route.loginFlowStart).toBeFalsy();
  });

  it('returns the path after /ha and the query unchanged', () => {
    const match = matchHomeAssistantProxyRequest(
      'GET',
      '/ha/api/history/period/2026-10-07T08:00:00Z?filter_entity_id=sensor.a&minimal_response'
    );
    expect(match).toMatchObject({
      allowed: true,
      path: '/api/history/period/2026-10-07T08:00:00Z',
      search: '?filter_entity_id=sensor.a&minimal_response',
    });
  });

  it('refuses paths outside the list, including the rest of the HA API', () => {
    for (const url of [
      '/ha',
      '/ha/',
      '/ha/api/states',
      '/ha/api/services/light/turn_on',
      '/ha/api/config',
      '/ha/api/hassio/addons',
      '/ha/api/websocket',
      '/ha/auth/authorize',
      '/ha/auth/login_flow/abc/extra',
      '/ha/api/camera_proxy',
      '/ha/api/camera_proxy/',
      '/ha/api/camera_proxy/camera.a/extra',
      '/ha/api/media_player_proxy/media_player.sala/browse_media',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/',
      '/ha/api/media_player_proxy/media_player.sala/altro/album/123',
      '/ha/api/media_player_proxy/browse_media/album/123',
      '/ha/api/hls',
      '/ha/api/hls/',
      '/ha/manifest.json',
      '/ha/frontend_latest/app.js',
    ]) {
      expect(isAllowed('GET', url), url).toBe(false);
      expect(isAllowed('POST', url), url).toBe(false);
    }
  });

  it('refuses traversal, double slashes, backslashes and encoded dots or slashes', () => {
    for (const url of [
      '/ha/api/camera_proxy/../../api/states',
      '/ha/api/hls/../../api/states',
      '/ha/api/hls/abc/..',
      '/ha/api/camera_proxy/..',
      '/ha/api/hls/%2e%2e/%2e%2e/api/states',
      '/ha/api/hls/%2E%2E/api/states',
      '/ha/api/camera_proxy/.%2e',
      '/ha/api/camera_proxy/camera.a%2f..%2fstates',
      '/ha/api/camera_proxy/camera.a%2F',
      '/ha/api/camera_proxy/camera.a%5c..',
      '/ha/api/camera_proxy/camera.a%00',
      '/ha//api/camera_proxy/camera.a',
      '/ha/api//camera_proxy/camera.a',
      '/ha/api/hls/abc//segment.m4s',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/..',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/../../../api/states',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/%2e%2e/api/states',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/album%2F..%2F..%2Fapi',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/album//123',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/album\\..\\api',
      '/ha/api/camera_proxy\\camera.a',
      '/ha/api/hls/abc\\..\\..\\api',
      '/ha/api/camera_proxy/camera.a%zz',
      '/ha/api/camera_proxy/camera a',
      '/ha/api/camera_proxy/camera.a?x=<script>',
      '/ha/api/camera_proxy/camera.a?x=%zz',
    ]) {
      expect(isAllowed('GET', url), url).toBe(false);
    }
  });
});

describe('matchHomeAssistantWebSocketRequest', () => {
  it('accepts only GET /ha/api/websocket', () => {
    expect(matchHomeAssistantWebSocketRequest('GET', '/ha/api/websocket')).toEqual({
      path: '/api/websocket',
      search: '',
    });
    expect(matchHomeAssistantWebSocketRequest('POST', '/ha/api/websocket')).toBeNull();
    expect(matchHomeAssistantWebSocketRequest('GET', '/api/websocket')).toBeNull();
    expect(matchHomeAssistantWebSocketRequest('GET', '/ha/api/websocket/x')).toBeNull();
    expect(matchHomeAssistantWebSocketRequest('GET', '/ha/api/../api/websocket')).toBeNull();
    expect(matchHomeAssistantWebSocketRequest('GET', '/ha//api/websocket')).toBeNull();
    expect(matchHomeAssistantWebSocketRequest('GET', '/ha/auth/token')).toBeNull();
  });
});

describe('removeIngressPrefix', () => {
  it('strips the X-Ingress-Path prefix only when the URL starts with it', () => {
    expect(removeIngressPrefix('/api/hassio_ingress/abc/ha/auth/token', '/api/hassio_ingress/abc')).toBe(
      '/ha/auth/token'
    );
    expect(removeIngressPrefix('/api/hassio_ingress/abc', '/api/hassio_ingress/abc')).toBe('/');
    expect(removeIngressPrefix('/ha/auth/token', '/api/hassio_ingress/abc')).toBe('/ha/auth/token');
    expect(removeIngressPrefix('/ha/auth/token', undefined)).toBe('/ha/auth/token');
    expect(removeIngressPrefix('/ha/auth/token', ['/ha'])).toBe('/ha/auth/token');
  });
});
