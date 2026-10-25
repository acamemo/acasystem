/**
 * Camera sources, ported from components/camera/CameraFeed.jsx: stream engine, go2rtc player
 * template and mode, proxy URLs and the fallback plan custom → WebRTC → HLS → MJPEG → snapshot.
 */
import type { CardSettings } from '@/@types/dashboard';

export type CameraEngine = 'auto' | 'go2rtc' | 'webrtc' | 'snapshot' | 'ha';
export type CameraSource = 'custom' | 'webrtc' | 'hls' | 'mjpeg' | 'snapshot';
export type Go2rtcMode = 'auto' | 'webrtc' | 'mse';

const text = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

export function appendCameraCacheBust(url: string, value: string | number): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_ts=${value}`;
}

export function buildCameraProxyUrl(
  basePath: string,
  entityId: string,
  accessToken: string
): string {
  if (!entityId) return '';
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${basePath}/${entityId}${tokenQuery}`;
}

export function resolveCameraTemplate(template: string, entityId: string): string {
  if (!template) return '';
  const objectId = entityId.includes('.') ? entityId.split('.').slice(1).join('.') : entityId;
  return template.replaceAll('{entity_id}', entityId).replaceAll('{entity_object_id}', objectId);
}

export function normalizeCameraStreamEngine(value: unknown): CameraEngine {
  const raw = text(value).toLowerCase();
  if (raw === 'go2rtc' || raw === 'custom' || raw === 'mse') return 'go2rtc';
  if (raw === 'webrtc') return 'webrtc';
  if (raw === 'snapshot') return 'snapshot';
  if (raw === 'ha' || raw === 'ha_stream' || raw === 'hastream' || raw === 'ha-stream') return 'ha';
  return 'auto';
}

export interface SourcePlanInput {
  engine: CameraEngine;
  frontendStreamTypes: readonly string[] | null;
  customPlayerUrl: string;
  hasConnection: boolean;
  hasAccessToken: boolean;
}

export function getCameraSourcePlan({
  engine,
  frontendStreamTypes,
  customPlayerUrl,
  hasConnection,
  hasAccessToken,
}: SourcePlanInput): CameraSource[] {
  if (engine === 'snapshot') return ['snapshot'];
  const plan: CameraSource[] = [];
  const capabilitiesKnown = Array.isArray(frontendStreamTypes);
  const supportsWebRtc = frontendStreamTypes?.includes('web_rtc') ?? false;
  const supportsHls = frontendStreamTypes?.includes('hls') ?? false;
  // Configured go2rtc players stay first, as in Tunet's Auto mode.
  if (customPlayerUrl && (engine === 'auto' || engine === 'go2rtc' || engine === 'webrtc')) {
    plan.push('custom');
  }
  if (supportsWebRtc) plan.push('webrtc');
  if (
    hasConnection &&
    (engine === 'go2rtc' ||
      engine === 'ha' ||
      engine === 'webrtc' ||
      supportsHls ||
      !capabilitiesKnown)
  ) {
    plan.push('hls');
  }
  if (hasAccessToken) plan.push('mjpeg');
  plan.push('snapshot');
  return [...new Set(plan)];
}

export function normalizeGo2rtcMode(value: unknown): Go2rtcMode {
  const raw = text(value).toLowerCase();
  return raw === 'webrtc' || raw === 'mse' ? raw : 'auto';
}

export function applyGo2rtcMode(value: string, mode: unknown): string {
  const url = value.trim();
  if (!url) return '';
  const normalized = normalizeGo2rtcMode(mode);
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutHash.indexOf('?');
  const base = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');
  if (normalized === 'auto') params.delete('mode');
  else params.set('mode', normalized);
  const query = params.toString();
  return `${base}${query ? `?${query}` : ''}${hash}`;
}

/** Camera settings saved by Tunet in cardSettings. */
export interface CameraSettings {
  cameraId: string;
  engine: CameraEngine;
  webrtcUrl: string;
  go2rtcMode: string;
  refreshMode: 'interval' | 'motion';
  refreshInterval: number;
  motionSensorId: string;
}

export function readCameraSettings(settings: CardSettings): CameraSettings {
  return {
    cameraId: text(settings.cameraId),
    engine: normalizeCameraStreamEngine(settings.cameraStreamEngine),
    webrtcUrl: text(settings.cameraWebrtcUrl).trim(),
    go2rtcMode: text(settings.cameraGo2rtcMode),
    refreshMode: settings.cameraRefreshMode === 'motion' ? 'motion' : 'interval',
    refreshInterval: Math.max(2, Number(settings.cameraRefreshInterval) || 10),
    motionSensorId: text(settings.cameraMotionSensor),
  };
}

/** go2rtc player URL from the template, with the configured mode (legacy customPlayerUrl). */
export function customPlayerUrl(
  camera: CameraSettings,
  getEntityImageUrl: (path?: string | null) => string | null
): string {
  const resolved = resolveCameraTemplate(camera.webrtcUrl, camera.cameraId);
  if (!resolved) return '';
  const withMode = camera.go2rtcMode ? applyGo2rtcMode(resolved, camera.go2rtcMode) : resolved;
  if (/^https?:\/\//i.test(withMode)) return withMode;
  return getEntityImageUrl(withMode) ?? '';
}

export const isMotionState = (state: string | undefined): boolean =>
  state === 'on' || state === 'detected';
