import { useEffect, useRef, useState } from 'react';
import type { ServiceData } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { useThrottledSender } from '../../controls/shared/useThrottledSender';
import { callSafely } from '../../controls/shared/service';
import type { ConfirmedCommand } from '../../media/hooks/commands';
import type { MediaControls } from '../../media/hooks/useMediaControls';
import { mediaActionAllowed, mediaServiceSupported, productMediaView } from './productMediaModel';

const sameLevel = (requested: number | null, confirmed: number | null) =>
  requested !== null && confirmed !== null
    ? Math.abs(requested - confirmed) < 0.01
    : requested === confirmed;
const samePosition = (requested: number | null, confirmed: number | null) =>
  requested !== null && confirmed !== null
    ? Math.abs(requested - confirmed) < 2
    : requested === confirmed;

/** Product controls retain the observed value and never retry a physical command automatically. */
export function useProductMediaControls(entityId: string, disabled = false) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog(),
    visible = usePageVisible();
  const entity = runtime.entities[entityId],
    view = productMediaView(entity);
  const state = useTrackedCommand(view.state),
    power = useTrackedCommand(view.available && view.state !== 'off' && view.state !== 'standby'),
    volume = useTrackedCommand(view.volume, sameLevel),
    muted = useTrackedCommand(view.muted),
    shuffle = useTrackedCommand(view.shuffle),
    repeat = useTrackedCommand(view.repeat),
    source = useTrackedCommand(view.source),
    sound = useTrackedCommand(view.sound),
    position = useTrackedCommand(view.position, samePosition);
  const [sending, setSending] = useState<Record<string, boolean>>({}),
    [feedback, setFeedback] = useState<string | null>(null);
  const numericWaiting = useRef<{ volume_set: number | null; media_seek: number | null }>({
    volume_set: null,
    media_seek: null,
  });
  const inFlight = useRef(new Set<string>()),
    mounted = useRef(false);
  const latest = useRef({ runtime, services, entityId, disabled, visible });
  latest.current = { runtime, services, entityId, disabled, visible };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      numericWaiting.current = { volume_set: null, media_seek: null };
    };
  }, []);
  const allowed = (service: string) => {
    const now = latest.current;
    return (
      now.entityId === entityId &&
      !now.disabled &&
      !now.runtime.editMode &&
      now.visible &&
      now.runtime.entitiesLoaded &&
      !!now.runtime.conn &&
      now.runtime.conn.connected !== false &&
      mediaActionAllowed(productMediaView(now.runtime.entities[entityId]), now.services, service)
    );
  };
  const send = (service: string, data: ServiceData = {}) => {
    if (!allowed(service) || inFlight.current.has(service)) return null;
    inFlight.current.add(service);
    setSending((current) => ({ ...current, [service]: true }));
    setFeedback(null);
    const call = callSafely(latest.current.runtime, 'media_player', service, {
      entity_id: entityId,
      ...data,
    });
    const release = () => {
      inFlight.current.delete(service);
      if (mounted.current) setSending((current) => ({ ...current, [service]: false }));
    };
    void call.then(
      () => {
        release();
        if (mounted.current) setFeedback('HA ha accettato il comando.');
      },
      () => {
        release();
        if (mounted.current) setFeedback('Esito non confermato. Verifica lo stato del lettore.');
      }
    );
    return call;
  };
  const requestState = (service: string, target: string) => {
    if (state.pending && (service === 'media_play' || service === 'turn_on')) return;
    const call = send(service);
    if (!call) return;
    state.request(target);
    state.track(call);
    state.settle();
  };
  const sendNumeric = (service: 'volume_set' | 'media_seek', value: number) => {
    if (!mounted.current || !allowed(service)) return;
    const fresh = productMediaView(latest.current.runtime.entities[entityId]);
    if (
      service === 'volume_set'
        ? fresh.volume === null || value < 0 || value > 1
        : fresh.duration === null || fresh.position === null || value < 0 || value > fresh.duration
    )
      return;
    if (inFlight.current.has(service)) {
      numericWaiting.current[service] = value;
      return;
    }
    numericWaiting.current[service] = null;
    const call = send(
      service,
      service === 'volume_set' ? { volume_level: value } : { seek_position: value }
    );
    if (!call) return;
    const command = service === 'volume_set' ? volume : position;
    command.track(call);
    command.settle();
    void call.then(
      () => {
        const next = numericWaiting.current[service];
        numericWaiting.current[service] = null;
        if (next !== null && next !== value && mounted.current) sendNumeric(service, next);
      },
      () => {
        numericWaiting.current[service] = null;
      }
    );
  };
  const volumeSender = useThrottledSender((value: number) => sendNumeric('volume_set', value));
  const seekSender = useThrottledSender((value: number) => sendNumeric('media_seek', value));
  useEffect(() => {
    if (
      !visible ||
      disabled ||
      runtime.editMode ||
      !runtime.conn ||
      runtime.conn.connected === false ||
      !view.available
    ) {
      volumeSender.cancel();
      seekSender.cancel();
      numericWaiting.current = { volume_set: null, media_seek: null };
    }
  }, [visible, disabled, runtime.editMode, runtime.conn, view.available, volumeSender, seekSender]);
  const toggle = <T>(command: typeof muted, service: string, value: T, data: ServiceData) => {
    if (command.pending) return;
    const call = send(service, data);
    if (!call) return;
    command.request(value as boolean);
    command.track(call);
    command.settle();
  };
  const setOption = (
    command: typeof source,
    service: string,
    key: string,
    value: string,
    options: string[]
  ) => {
    if (!options.includes(value) || command.pending) return;
    const fresh = productMediaView(latest.current.runtime.entities[entityId]);
    if (!(key === 'source' ? fresh.sources : fresh.sounds).includes(value)) return;
    const call = send(service, { [key]: value });
    if (!call) return;
    command.request(value);
    command.track(call);
    command.settle();
  };
  const compatible = <T>(
    command: ReturnType<typeof useTrackedCommand<T>>,
    confirmed: T
  ): ConfirmedCommand<T> => ({
    value: command.value,
    confirmed,
    pending: command.pending,
    error: command.failed,
    request: () => undefined,
    track: () => undefined,
    retry: () => undefined,
    timedOut: command.message,
  });
  const ready = (service: string) => mediaServiceSupported(view, services, service);
  const playService = view.state === 'playing' ? 'media_pause' : 'media_play';
  const powerAction = ready(
    view.state === 'off' || view.state === 'standby' ? 'turn_on' : 'turn_off'
  )
    ? view.state === 'off' || view.state === 'standby'
      ? ('turn_on' as const)
      : ('turn_off' as const)
    : null;
  const controls: MediaControls = {
    entity,
    caps: {
      playPause: ready(playService),
      seek: ready('media_seek') && view.duration !== null && view.position !== null,
      volumeSet: ready('volume_set') && view.volume !== null,
      volumeMute: ready('volume_mute') && view.muted !== null,
      previous: ready('media_previous_track'),
      next: ready('media_next_track'),
      playMedia: ready('play_media'),
      shuffle: ready('shuffle_set') && view.shuffle !== null,
      repeat: ready('repeat_set') && view.repeat !== null,
    },
    playing: {
      ...compatible(state, view.state),
      value: state.value === 'playing',
      pending: state.pending || !!sending.media_play || !!sending.media_pause,
      confirmed: view.state === 'playing',
      request: () => undefined,
    },
    power: {
      ...compatible(power, view.available && view.state !== 'off' && view.state !== 'standby'),
      pending: power.pending || !!sending.turn_on || !!sending.turn_off,
    },
    powerAction,
    volume: {
      ...compatible(volume, view.volume),
      value: volume.value ?? 0,
      confirmed: view.volume ?? 0,
      request: () => undefined,
    },
    muted: {
      ...compatible(muted, view.muted),
      value: muted.value ?? false,
      confirmed: view.muted ?? false,
      request: () => undefined,
    },
    shuffle: {
      ...compatible(shuffle, view.shuffle),
      value: shuffle.value ?? false,
      confirmed: view.shuffle ?? false,
      request: () => undefined,
    },
    repeat: {
      ...compatible(repeat, view.repeat),
      value: repeat.value ?? 'off',
      confirmed: view.repeat ?? 'off',
      request: () => undefined,
    },
    busy: sending.media_stop
      ? 'stop'
      : sending.media_previous_track
        ? 'previous'
        : sending.media_next_track
          ? 'next'
          : null,
    error: [state, power, volume, muted, shuffle, repeat, source, sound, position].some(
      (command) => command.failed
    ),
    togglePlay: () =>
      requestState(playService, playService === 'media_pause' ? 'paused' : 'playing'),
    togglePower: () => {
      if (powerAction && !power.pending) {
        const call = send(powerAction);
        if (call) {
          power.request(powerAction === 'turn_on');
          power.track(call);
          power.settle();
        }
      }
    },
    previous: () => {
      send('media_previous_track');
    },
    next: () => {
      send('media_next_track');
    },
    setVolume: (value) => {
      if (Number.isFinite(value) && value >= 0 && value <= 100 && allowed('volume_set')) {
        volume.request(value / 100);
        volumeSender.push(value / 100);
      }
    },
    stepVolume: (direction) => {
      if (view.volume !== null) {
        const value = Math.max(0, Math.min(1, view.volume + direction * 0.03));
        controls.setVolume(value * 100);
      }
    },
    toggleMute: () => {
      if (view.muted !== null)
        toggle(muted, 'volume_mute', !view.muted, { is_volume_muted: !view.muted });
    },
    toggleShuffle: () => {
      if (view.shuffle !== null)
        toggle(shuffle, 'shuffle_set', !view.shuffle, { shuffle: !view.shuffle });
    },
    cycleRepeat: () => {
      if (view.repeat !== null && !repeat.pending) {
        const value = view.repeat === 'off' ? 'one' : view.repeat === 'one' ? 'all' : 'off';
        const call = send('repeat_set', { repeat: value });
        if (call) {
          repeat.request(value);
          repeat.track(call);
          repeat.settle();
        }
      }
    },
    seek: (value) => {
      const fresh = productMediaView(latest.current.runtime.entities[entityId]);
      if (
        fresh.duration !== null &&
        fresh.position !== null &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= fresh.duration &&
        allowed('media_seek')
      ) {
        position.request(value);
        seekSender.push(value);
      }
    },
  };
  return {
    controls,
    view,
    feedback: controls.error ? 'Esito non confermato. Verifica lo stato del lettore.' : feedback,
    source,
    sound,
    sending,
    blocked:
      disabled ||
      runtime.editMode ||
      !visible ||
      !runtime.entitiesLoaded ||
      !runtime.conn ||
      runtime.conn.connected === false ||
      !view.available,
    stop: ready('media_stop')
      ? () => {
          send('media_stop');
        }
      : undefined,
    step:
      ready('volume_up') && ready('volume_down')
        ? (direction: 1 | -1) => {
            send(direction > 0 ? 'volume_up' : 'volume_down');
          }
        : undefined,
    setSource: (value: string) => setOption(source, 'select_source', 'source', value, view.sources),
    setSound: (value: string) =>
      setOption(sound, 'select_sound_mode', 'sound_mode', value, view.sounds),
    sourceSupported: ready('select_source'),
    soundSupported: ready('select_sound_mode'),
  };
}
