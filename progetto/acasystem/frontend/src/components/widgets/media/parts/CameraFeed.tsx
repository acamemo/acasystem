import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, MaterialLayers, Text, materialClass } from '@/components/primitives';
import type { HaMessage } from '@/@types/ha';
import {
  appendCameraCacheBust,
  buildCameraProxyUrl,
  customPlayerUrl,
  getCameraSourcePlan,
  type CameraSettings,
  type CameraSource,
} from '../model/camera';
import { MediaIcon } from '../icons';
import { testi } from '../testi';

const SOURCE_TIMEOUT_MS = 15000;

type ImageUrl = (path?: string | null) => string | null;

/** Part of the HA connection used by the camera: requests, and subscriptions for WebRTC. */
export interface CameraConnection {
  sendMessagePromise: (message: HaMessage) => Promise<unknown>;
  subscribeMessage?: (
    callback: (event: unknown) => void,
    message: HaMessage
  ) => Promise<() => unknown>;
}

export const asCameraConnection = (conn: unknown): CameraConnection | null =>
  typeof conn === 'object' &&
  conn !== null &&
  typeof (conn as { sendMessagePromise?: unknown }).sendMessagePromise === 'function'
    ? (conn as CameraConnection)
    : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveUrl = (url: string, getEntityImageUrl: ImageUrl): string =>
  /^https?:\/\//i.test(url) ? url : (getEntityImageUrl(url) ?? '');

/**
 * Snapshot URL: the path signed by HA (`auth/sign_path`) or, without a connection, the camera
 * proxy with the entity's access token; `refreshKey` busts the cache (legacy CameraFeed).
 */
export function useSnapshotUrl(
  entityId: string,
  accessToken: string,
  conn: CameraConnection | null,
  getEntityImageUrl: ImageUrl,
  refreshKey: number,
  enabled = true
): string | null {
  const legacyUrl = resolveUrl(
    appendCameraCacheBust(
      buildCameraProxyUrl('/api/camera_proxy', entityId, accessToken),
      refreshKey
    ),
    getEntityImageUrl
  );
  const key = `${entityId}:${refreshKey}:${accessToken}`;
  const [signed, setSigned] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!conn || !entityId || !enabled) return undefined;
    let cancelled = false;
    conn
      .sendMessagePromise({ type: 'auth/sign_path', path: `/api/camera_proxy/${entityId}` })
      .then((response) => {
        const path = isRecord(response) && typeof response.path === 'string' ? response.path : '';
        return path
          ? resolveUrl(appendCameraCacheBust(path, refreshKey), getEntityImageUrl)
          : legacyUrl;
      })
      .catch(() => legacyUrl)
      .then((url) => {
        if (!cancelled) setSigned({ key, url });
      });
    return () => {
      cancelled = true;
    };
  }, [conn, entityId, refreshKey, getEntityImageUrl, legacyUrl, key, enabled]);

  if (!enabled) return null;
  if (!conn) return legacyUrl || null;
  return signed?.key === key ? signed.url || null : null;
}

function useSourceTimeout(active: boolean, onTimeout: () => void) {
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(onTimeout, SOURCE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [active, onTimeout]);
}

interface PlayerProps {
  onReady: () => void;
  onError: () => void;
}

const CameraImage = memo(function CameraImage({
  src,
  alt,
  fit,
  onReady,
  onError,
}: PlayerProps & { src: string; alt: string; fit: 'cover' | 'contain' }) {
  const [loaded, setLoaded] = useState(false);
  useSourceTimeout(!loaded, onError);
  return (
    <img
      src={src}
      alt={alt}
      className="aca-media-feed__media"
      style={{ objectFit: fit }}
      referrerPolicy="no-referrer"
      onLoad={() => {
        setLoaded(true);
        onReady();
      }}
      onError={onError}
    />
  );
});

/**
 * After the load of a cross-origin player, how long a frame-src violation may still arrive: in
 * Chromium the violation comes a few milliseconds before or after the load of the blocked iframe.
 */
const CROSS_ORIGIN_SETTLE_MS = 1000;

const withoutFragment = (url: URL) => url.href.slice(0, url.href.length - url.hash.length);

/** Whether a blocked URI (full, or redacted to the origin for cross-origin frames) is `src`. */
function isBlockedSource(blockedURI: string, src: string): boolean {
  try {
    const source = new URL(src, window.location.href);
    const denied = new URL(blockedURI, window.location.href);
    if (withoutFragment(denied) === withoutFragment(source)) return true;
    return denied.origin === source.origin && denied.pathname === '/' && !denied.search;
  } catch {
    return false;
  }
}

/**
 * Custom player (go2rtc) in an iframe. The load event does not prove it works: an iframe blocked
 * by the Content Security Policy also emits it. A frame-src violation for this player hands over
 * to the next source at once, even after the load; a same-origin player is ready when its document
 * is readable; a cross-origin one, which cannot be read, when no violation arrived shortly after
 * the load. Without any load the source timeout hands over (REP-20261006-001, SEC-3).
 */
const CustomPlayer = memo(function CustomPlayer({
  src,
  title,
  onReady,
  onError,
}: PlayerProps & { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [settling, setSettling] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const blocked = useRef(false);
  useSourceTimeout(!loaded, onError);
  // Layout effect: listening before the browser can report the navigation of the new iframe.
  useLayoutEffect(() => {
    const onViolation = (event: SecurityPolicyViolationEvent) => {
      if (event.disposition === 'report' || !event.effectiveDirective.startsWith('frame-src'))
        return;
      if (!isBlockedSource(event.blockedURI, src)) return;
      blocked.current = true;
      onError();
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    return () => document.removeEventListener('securitypolicyviolation', onViolation);
  }, [src, onError]);
  useEffect(() => {
    if (!settling) return undefined;
    const timer = window.setTimeout(() => {
      if (blocked.current) return;
      setLoaded(true);
      onReady();
    }, CROSS_ORIGIN_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [settling, onReady]);
  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      className="aca-media-feed__media"
      allow="autoplay; fullscreen; picture-in-picture"
      referrerPolicy="no-referrer"
      onLoad={() => {
        if (blocked.current) return;
        let sameOrigin: boolean;
        try {
          sameOrigin = new URL(src, window.location.href).origin === window.location.origin;
        } catch {
          return;
        }
        if (!sameOrigin) {
          setSettling(true);
          return;
        }
        // A blocked or failed same-origin frame holds an error page with an opaque origin.
        const playerDocument = frame.current?.contentDocument;
        if (
          !playerDocument ||
          playerDocument.URL === 'about:blank' ||
          playerDocument.URL.startsWith('chrome-error:')
        )
          return;
        setLoaded(true);
        onReady();
      }}
      onError={onError}
    />
  );
});

interface VideoProps extends PlayerProps {
  conn: CameraConnection | null;
  entityId: string;
  posterUrl: string | null;
  fit: 'cover' | 'contain';
  controls: boolean;
  muted: boolean;
}

const HlsPlayer = memo(function HlsPlayer({
  conn,
  entityId,
  posterUrl,
  fit,
  controls,
  muted,
  onReady,
  onError,
  getEntityImageUrl,
}: VideoProps & { getEntityImageUrl: ImageUrl }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const markReady = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const video = videoRef.current;
    let disposed = false;
    let destroy: (() => void) | null = null;
    timeoutRef.current = window.setTimeout(onError, SOURCE_TIMEOUT_MS);
    const fail = () => {
      if (disposed) return;
      window.clearTimeout(timeoutRef.current);
      onError();
    };

    const start = async () => {
      if (!conn) {
        fail();
        return;
      }
      try {
        const response = await conn.sendMessagePromise({
          type: 'camera/stream',
          entity_id: entityId,
          format: 'hls',
        });
        if (disposed) return;
        const raw = isRecord(response) && typeof response.url === 'string' ? response.url : '';
        const streamUrl = raw ? resolveUrl(raw, getEntityImageUrl) : '';
        if (!streamUrl || !video) {
          fail();
          return;
        }
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.load();
          void video.play().catch(() => undefined);
          return;
        }
        const { default: Hls } = await import('hls.js');
        if (disposed) return;
        if (!Hls.isSupported()) {
          fail();
          return;
        }
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 15 });
        destroy = () => hls.destroy();
        let recoveries = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || disposed) return;
          if (recoveries === 0 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            recoveries += 1;
            hls.startLoad();
            return;
          }
          if (recoveries === 0 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            recoveries += 1;
            hls.recoverMediaError();
            return;
          }
          fail();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined);
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } catch {
        fail();
      }
    };
    void start();

    return () => {
      disposed = true;
      window.clearTimeout(timeoutRef.current);
      destroy?.();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [conn, entityId, getEntityImageUrl, onError]);

  return (
    <video
      ref={videoRef}
      className="aca-media-feed__media"
      style={{ objectFit: fit }}
      poster={posterUrl ?? undefined}
      autoPlay
      playsInline
      muted={muted}
      controls={controls}
      onLoadedData={markReady}
      onPlaying={markReady}
      onError={onError}
    />
  );
});

const WebRtcPlayer = memo(function WebRtcPlayer({
  conn,
  entityId,
  posterUrl,
  fit,
  controls,
  muted,
  onReady,
  onError,
}: VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const markReady = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const video = videoRef.current;
    let disposed = false;
    let peer: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;
    let unsubscribe: Promise<() => unknown> | null = null;
    let sessionId = '';
    const pendingCandidates: RTCIceCandidateInit[] = [];
    timeoutRef.current = window.setTimeout(onError, SOURCE_TIMEOUT_MS);

    const fail = () => {
      if (disposed) return;
      window.clearTimeout(timeoutRef.current);
      onError();
    };
    const sendCandidate = (candidate: RTCIceCandidateInit) => {
      if (!sessionId || !conn) return;
      void conn
        .sendMessagePromise({
          type: 'camera/webrtc/candidate',
          entity_id: entityId,
          session_id: sessionId,
          candidate,
        })
        .catch(() => undefined);
    };
    const handleEvent = async (event: unknown) => {
      if (disposed || !peer || !isRecord(event)) return;
      try {
        if (event.type === 'session') {
          sessionId = typeof event.session_id === 'string' ? event.session_id : '';
          pendingCandidates.splice(0).forEach(sendCandidate);
          return;
        }
        if (event.type === 'answer' && typeof event.answer === 'string') {
          if (peer.signalingState !== 'stable' && peer.signalingState !== 'closed') {
            await peer.setRemoteDescription({ type: 'answer', sdp: event.answer });
          }
          return;
        }
        if (event.type === 'candidate' && isRecord(event.candidate)) {
          const candidate = event.candidate as RTCIceCandidateInit;
          await peer.addIceCandidate(
            candidate.sdpMid || candidate.sdpMLineIndex != null
              ? candidate
              : { ...candidate, sdpMid: '0' }
          );
          return;
        }
        if (event.type === 'error') fail();
      } catch {
        fail();
      }
    };

    const start = async () => {
      if (typeof window.RTCPeerConnection === 'undefined' || !conn?.subscribeMessage) {
        fail();
        return;
      }
      try {
        const clientConfig = await conn.sendMessagePromise({
          type: 'camera/webrtc/get_client_config',
          entity_id: entityId,
        });
        if (disposed) return;
        const configuration =
          isRecord(clientConfig) && isRecord(clientConfig.configuration)
            ? (clientConfig.configuration as RTCConfiguration)
            : {};
        peer = new window.RTCPeerConnection(configuration);
        if (isRecord(clientConfig) && typeof clientConfig.dataChannel === 'string') {
          peer.createDataChannel(clientConfig.dataChannel);
        }
        stream = new window.MediaStream();
        peer.ontrack = (event) => {
          if (disposed || !stream) return;
          if (event.track.kind === 'audio' && muted) return;
          stream.addTrack(event.track);
          if (video) {
            video.srcObject = stream;
            void video.play().catch(() => undefined);
          }
        };
        peer.onicecandidate = (event) => {
          if (!event.candidate?.candidate) return;
          const candidate = event.candidate.toJSON();
          if (sessionId) sendCandidate(candidate);
          else pendingCandidates.push(candidate);
        };
        peer.onconnectionstatechange = () => {
          if (peer?.connectionState === 'failed' || peer?.connectionState === 'closed') fail();
        };
        peer.addTransceiver('audio', { direction: 'recvonly' });
        peer.addTransceiver('video', { direction: 'recvonly' });
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        if (disposed) return;
        unsubscribe = conn.subscribeMessage((event) => void handleEvent(event), {
          type: 'camera/webrtc/offer',
          entity_id: entityId,
          offer: offer.sdp,
        });
      } catch {
        fail();
      }
    };
    void start();

    return () => {
      disposed = true;
      window.clearTimeout(timeoutRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      peer?.close();
      Promise.resolve(unsubscribe)
        .then((stop) => stop?.())
        .catch(() => undefined);
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [conn, entityId, muted, onError]);

  return (
    <video
      ref={videoRef}
      className="aca-media-feed__media"
      style={{ objectFit: fit }}
      poster={posterUrl ?? undefined}
      autoPlay
      playsInline
      muted={muted}
      controls={controls}
      onLoadedData={markReady}
      onPlaying={markReady}
      onError={onError}
    />
  );
});

export interface CameraStreamProps {
  camera: CameraSettings;
  accessToken: string;
  conn: CameraConnection | null;
  getEntityImageUrl: ImageUrl;
  /** Changing it restarts the plan (refresh button, mode switch). */
  refreshKey: number;
  /** Snapshot only (the «Istantanea» view). */
  snapshotOnly: boolean;
  alt: string;
  fit?: 'cover' | 'contain';
  controls?: boolean;
}

/**
 * Live view with the legacy fallback chain: each source that fails or stays silent for 15 s
 * hands over to the next; when none is left the user gets a clear message and a retry.
 */
export function CameraStream({
  camera,
  accessToken,
  conn,
  getEntityImageUrl,
  refreshKey,
  snapshotOnly,
  alt,
  fit = 'contain',
  controls = false,
}: CameraStreamProps) {
  const entityId = camera.cameraId;
  const engine = snapshotOnly ? 'snapshot' : camera.engine;
  const playerUrl = useMemo(
    () => customPlayerUrl(camera, getEntityImageUrl),
    [camera, getEntityImageUrl]
  );
  const mjpegUrl = resolveUrl(
    buildCameraProxyUrl('/api/camera_proxy_stream', entityId, accessToken),
    getEntityImageUrl
  );
  const snapshotUrl = useSnapshotUrl(entityId, accessToken, conn, getEntityImageUrl, refreshKey);
  const planKey = `${entityId}:${engine}:${playerUrl}:${refreshKey}`;
  const [plan, setPlan] = useState<{ key: string; sources: CameraSource[] } | null>(null);
  const [attempt, setAttempt] = useState({ key: '', index: 0, ready: false });

  useEffect(() => {
    let cancelled = false;
    const capabilities: Promise<readonly string[] | null> = conn
      ? conn
          .sendMessagePromise({ type: 'camera/capabilities', entity_id: entityId })
          .then((response) =>
            isRecord(response) && Array.isArray(response.frontend_stream_types)
              ? response.frontend_stream_types.filter(
                  (item): item is string => typeof item === 'string'
                )
              : []
          )
          .catch(() => null)
      : Promise.resolve(null);
    void capabilities.then((frontendStreamTypes) => {
      if (cancelled) return;
      setPlan({
        key: planKey,
        sources: getCameraSourcePlan({
          engine,
          frontendStreamTypes,
          customPlayerUrl: playerUrl,
          hasConnection: Boolean(conn),
          hasAccessToken: Boolean(accessToken),
        }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [conn, entityId, engine, playerUrl, accessToken, planKey]);

  const preparing = !plan || plan.key !== planKey;
  const index = attempt.key === planKey ? attempt.index : 0;
  const ready = attempt.key === planKey && attempt.ready;
  const source = preparing ? undefined : plan.sources[index];

  const handleReady = useCallback(
    () =>
      setAttempt((current) => ({
        key: planKey,
        index: current.key === planKey ? current.index : 0,
        ready: true,
      })),
    [planKey]
  );
  const handleError = useCallback(
    () =>
      setAttempt((current) => ({
        key: planKey,
        index: (current.key === planKey ? current.index : 0) + 1,
        ready: false,
      })),
    [planKey]
  );
  const retry = () => setAttempt({ key: planKey, index: 0, ready: false });

  let media = null;
  if (source === 'custom' && playerUrl) {
    media = (
      <CustomPlayer
        key={playerUrl}
        src={playerUrl}
        title={alt}
        onReady={handleReady}
        onError={handleError}
      />
    );
  } else if (source === 'webrtc') {
    media = (
      <WebRtcPlayer
        conn={conn}
        entityId={entityId}
        posterUrl={snapshotUrl}
        fit={fit}
        controls={controls}
        muted
        onReady={handleReady}
        onError={handleError}
      />
    );
  } else if (source === 'hls') {
    media = (
      <HlsPlayer
        conn={conn}
        entityId={entityId}
        posterUrl={snapshotUrl}
        fit={fit}
        controls={controls}
        muted
        getEntityImageUrl={getEntityImageUrl}
        onReady={handleReady}
        onError={handleError}
      />
    );
  } else if (source === 'mjpeg' && mjpegUrl) {
    media = (
      <CameraImage
        key={mjpegUrl}
        src={mjpegUrl}
        alt={alt}
        fit={fit}
        onReady={handleReady}
        onError={handleError}
      />
    );
  } else if (source === 'snapshot' && snapshotUrl) {
    media = (
      <CameraImage
        key={snapshotUrl}
        src={snapshotUrl}
        alt={alt}
        fit={fit}
        onReady={handleReady}
        onError={handleError}
      />
    );
  }
  const waitingForSnapshot = source === 'snapshot' && !snapshotUrl;
  const exhausted = !preparing && !source;

  return (
    <div
      className="aca-media-feed"
      data-camera-source={source ?? (preparing ? 'loading' : 'unavailable')}
    >
      {media}
      {(preparing || waitingForSnapshot || (source && !ready)) && !exhausted && (
        <div className="aca-media-feed__overlay aca-media-feed__overlay--loading" role="status">
          <Text className="aca-type aca-type--caption">{testi.caricamentoVideocamera}</Text>
        </div>
      )}
      {exhausted && (
        <div className="aca-media-feed__overlay" role="status">
          <MediaIcon name="cameraOff" size="xl" />
          <Body as="span">{testi.streamNonDisponibile}</Body>
          <Text className="aca-type aca-type--caption">{testi.streamNonDisponibileNota}</Text>
          <Button variant="control" size="md" onClick={retry}>
            <MediaIcon name="refresh" size="sm" />
            {testi.riprova}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface SnapshotWindowProps {
  /** Current snapshot URL; a new URL is loaded behind the shown image, so refreshes do not flash. */
  url: string | null;
  alt: string;
  /** Called with the moment a snapshot finished loading. */
  onLoaded?: (at: number) => void;
  onRetry: () => void;
  className?: string;
}

/**
 * Camera preview of the widget: the last loaded snapshot set into a recessed well. Until the first
 * image arrives the well shows the camera glyph; a failed image gives a message and a retry.
 */
export function SnapshotWindow({ url, alt, onLoaded, onRetry, className }: SnapshotWindowProps) {
  const [shown, setShown] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const loading = Boolean(url) && url !== shown && failed !== url;
  const broken = Boolean(url) && failed === url && !shown;
  return (
    <div
      className={materialClass(
        { behavior: 'well', shape: 'rounded', size: 'inherit' },
        'aca-media-art',
        'aca-media-snapshot',
        className
      )}
      data-snapshot={shown ? 'image' : broken ? 'error' : 'loading'}
    >
      <MaterialLayers element="div" contentClassName="aca-media-art__content">
        {shown && (
          <img src={shown} alt={alt} className="aca-media-art__img" referrerPolicy="no-referrer" />
        )}
        {url && url !== shown && failed !== url && (
          <img
            key={url}
            src={url}
            alt=""
            aria-hidden="true"
            className="aca-media-art__img aca-media-snapshot__next"
            referrerPolicy="no-referrer"
            onLoad={() => {
              setShown(url);
              onLoaded?.(Date.now());
            }}
            onError={() => setFailed(url)}
          />
        )}
        {!shown && !broken && (
          <span className="aca-media-snapshot__state">
            <MediaIcon name="camera" size="xl" />
            {loading && (
              <span className="sr-only" role="status">
                {testi.caricamentoVideocamera}
              </span>
            )}
          </span>
        )}
        {broken && (
          <span className="aca-media-snapshot__state" role="status">
            <MediaIcon name="cameraOff" size="lg" />
            <Text className="aca-type aca-type--caption" tone="ink">
              {testi.immagineNonDisponibile}
            </Text>
            <Button
              variant="control"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setFailed(null);
                onRetry();
              }}
            >
              {testi.riprova}
            </Button>
          </span>
        )}
      </MaterialLayers>
    </div>
  );
}
