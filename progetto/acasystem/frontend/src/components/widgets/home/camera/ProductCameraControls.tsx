import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { ServiceData } from '@/@types/ha';
import { getEntityRegistry } from '@/api/haClient';
import { Body, Button, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { callSafely } from '../../controls/shared/service';
import { OptionPicker } from '../../utilities/shared/details';
import {
  cameraService,
  privateCameraDirectory,
  PRODUCT_CAMERA_FEATURE,
  productCameraView,
} from './productCameraModel';

export function ProductCameraControls({
  entityId,
  label,
  settings,
  disabled = false,
}: {
  entityId: string;
  label: string;
  settings: CardSettings;
  disabled?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible(),
    services = useServiceCatalog();
  const view = productCameraView(runtime.entities[entityId]);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  const [motionKnown, setMotionKnown] = useState(view.motion !== null);
  const sending = useRef(false),
    mounted = useRef(false);
  const [onvif, setOnvif] = useState<{
    conn: object;
    entityId: string;
    compatible: boolean;
  } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (view.motion !== null) setMotionKnown(true);
  }, [view.motion]);
  useEffect(() => {
    if (
      !visible ||
      settings.cameraPtz !== true ||
      !runtime.conn ||
      runtime.conn.connected === false
    )
      return;
    let active = true;
    const conn = runtime.conn;
    void getEntityRegistry(conn)
      .then((entries) => {
        if (active)
          setOnvif({
            conn,
            entityId,
            compatible: entries.some(
              (entry) =>
                entry.entity_id === entityId &&
                entry.platform === 'onvif' &&
                !entry.disabled_by &&
                !entry.hidden_by
            ),
          });
      })
      .catch(() => {
        if (active) setOnvif({ conn, entityId, compatible: false });
      });
    return () => {
      active = false;
    };
  }, [visible, settings.cameraPtz, runtime.conn, runtime.conn?.connected, entityId]);
  const blocked =
    disabled ||
    !visible ||
    runtime.editMode ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const has = (service: string, domain = 'camera') => cameraService(services, service, domain);
  const directory = privateCameraDirectory(settings.cameraCaptureDirectory);
  const players = Array.isArray(settings.cameraCastIds)
    ? settings.cameraCastIds.filter(
        (id): id is string =>
          typeof id === 'string' &&
          id.startsWith('media_player.') &&
          Boolean(runtime.entities[id]) &&
          !['unknown', 'unavailable'].includes(runtime.entities[id]!.state)
      )
    : [];
  const canPower = view.has(PRODUCT_CAMERA_FEATURE.power);
  const canMotion = view.motion !== null || motionKnown;
  const canPtz =
    settings.cameraPtz === true &&
    onvif?.conn === runtime.conn &&
    onvif.entityId === entityId &&
    onvif.compatible &&
    has('ptz', 'onvif');
  const send = (service: string, data: ServiceData = {}, domain = 'camera') => {
    if (blocked || sending.current || !has(service, domain)) return;
    // Recheck the advertised capability at the moment of the explicit action.
    if (['turn_on', 'turn_off'].includes(service) && !canPower) return;
    if (service.includes('motion_detection') && !canMotion) return;
    if (['record', 'play_stream'].includes(service) && !view.has(PRODUCT_CAMERA_FEATURE.stream))
      return;
    if (['snapshot', 'record'].includes(service) && !directory) return;
    if (service === 'ptz' && !canPtz) return;
    sending.current = true;
    setBusy(true);
    setFeedback('Invio del comando…');
    void callSafely(runtime, domain, service, { ...data, entity_id: entityId })
      .then(() => {
        if (mounted.current) setFeedback('Home Assistant ha accettato il comando.');
      })
      .catch(() => {
        if (mounted.current)
          setFeedback('Comando non riuscito. Riprova quando la videocamera è disponibile.');
      })
      .finally(() => {
        sending.current = false;
        if (mounted.current) setBusy(false);
      });
  };
  const button = (text: string, service: string, enabled = true, data: ServiceData = {}) =>
    enabled && has(service) ? (
      <Button
        key={service}
        variant="control"
        size="sm"
        aria-label={`${text} ${label}`}
        disabled={blocked || busy}
        onClick={() => send(service, data)}
      >
        {text}
      </Button>
    ) : null;
  const filename = (extension: string) =>
    `${directory}/${entityId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.${extension}`;
  return (
    <div className="product-camera-controls">
      <div
        className="product-camera-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {button('Accendi', 'turn_on', canPower)}
        {button('Spegni', 'turn_off', canPower)}
      </div>
      {canMotion && (
        <div className="product-camera-controls__group">
          <Body size="sm">Rilevamento movimento</Body>
          <Caption>
            {view.motion === null
              ? 'Stato non disponibile'
              : view.motion
                ? 'Abilitato'
                : 'Disabilitato'}
          </Caption>
          <div className="product-camera-controls__actions">
            {button('Abilita movimento', 'enable_motion_detection')}
            {button('Disabilita movimento', 'disable_motion_detection')}
          </div>
        </div>
      )}
      <div className="product-camera-controls__actions">
        {button('Scatta una foto', 'snapshot', !!directory, { filename: filename('jpg') })}
        {button(
          'Registra un video',
          'record',
          !!directory && view.has(PRODUCT_CAMERA_FEATURE.stream),
          {
            filename: filename('mp4'),
            duration: Math.max(1, Math.min(3600, Number(settings.cameraRecordDuration) || 30)),
            lookback: 0,
          }
        )}
      </div>
      {!directory && (has('snapshot') || has('record')) && (
        <Caption>
          Per foto e video, configura una cartella privata autorizzata nelle impostazioni del
          widget.
        </Caption>
      )}
      {view.has(PRODUCT_CAMERA_FEATURE.stream) && has('play_stream') && players.length > 0 && (
        <OptionPicker
          label={`Invia lo stream di ${label}`}
          value={null}
          placeholder="Scegli il lettore"
          disabled={blocked || busy}
          options={players.map((id) => ({
            value: id,
            label: String(runtime.entities[id]?.attributes.friendly_name || id),
          }))}
          onSelect={(id) => {
            if (players.includes(id)) send('play_stream', { media_player: id, format: 'hls' });
          }}
          isolateEscape
        />
      )}
      {canPtz && (
        <div className="product-camera-controls__group">
          <Body size="sm">Orientamento</Body>
          <div
            className="product-camera-controls__actions"
            role="group"
            aria-label={`Orientamento di ${label}`}
          >
            {(
              [
                ['Ruota a sinistra', 'pan', 'LEFT', 'chevronLeft'],
                ['Ruota a destra', 'pan', 'RIGHT', 'chevronRight'],
                ['Ruota in alto', 'tilt', 'UP', 'chevronUp'],
                ['Ruota in basso', 'tilt', 'DOWN', 'chevronDown'],
                ['Avvicina', 'zoom', 'ZOOM_IN', 'add'],
                ['Allontana', 'zoom', 'ZOOM_OUT', 'minus'],
              ] as const
            ).map(([text, axis, direction, icon]) => (
              <Button
                key={text}
                variant="control"
                size="sm"
                aria-label={`${text} ${label}`}
                disabled={blocked || busy}
                onClick={() =>
                  send(
                    'ptz',
                    { [axis]: direction, move_mode: 'RelativeMove', distance: 0.1, speed: 0.5 },
                    'onvif'
                  )
                }
              >
                <Icon name={icon} />
                <span>{text}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <Caption role="status" aria-live="polite">
        {feedback}
      </Caption>
    </div>
  );
}
