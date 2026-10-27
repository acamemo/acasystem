import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useConfirmedCommand, useNow, useServiceActions } from '../../hooks/commands';
import { useMediaControls } from '../../hooks/useMediaControls';
import { useTvAppLaunch } from '../../hooks/useTvAppLaunch';
import { useTvChannel } from '../../hooks/useTvChannel';
import { useTvVolume } from '../../hooks/useTvVolume';
import { attrString } from '../../model/entity';
import { detailsTarget, resolveTv, tvCanPower, tvPowerOffCall, type TvKind } from '../../model/tv';
import { tvHasKey, tvHasRemote, tvKeyCall, tvRemoteFlavor, type TvKey } from '../../model/tvRemote';
import { testi } from '../../testi';
import { readTvConfig, tvStatus } from '../../widgets/TvWidget';

/**
 * Everything the sections of the TV details share (sheet and console alike): the resolved TV,
 * the command hooks and the few values several sections read. The sections stay small and show
 * only what the entity supports; the logic lives here once.
 */
export function useTvDetailsState(kind: TvKind, { id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings, runtime.entities);
  const mediaPlayerId = config.mediaPlayerId;
  const view = resolveTv(
    kind,
    runtime.entities,
    id,
    mediaPlayerId,
    config.linkedMediaPlayers,
    runtime.customNames
  );
  const actions = useServiceActions();
  const playing = useConfirmedCommand(view.isPlaying);
  const power = useConfirmedCommand(view.isOn, { ignoreWhilePending: true });
  const channel = useTvChannel(kind, view, config.remoteId);
  const volume = useTvVolume(kind, view, mediaPlayerId, Boolean(config.remoteId));
  // Seek, shuffle and repeat of the player that is shown (a linked player, when it is playing).
  const media = useMediaControls(view.displayId);
  const now = useNow(1000, view.isPlaying);
  // An app tapped with the TV off switches it on first (power key pending), then opens.
  const appLaunch = useTvAppLaunch(view.isOn, runtime.callService, () =>
    power.request(true, () =>
      runtime.callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
    )
  );

  const controlMedia = (action: string) =>
    runtime.callService('media_player', action, {
      entity_id: detailsTarget(action, view, mediaPlayerId),
    });
  const run = (key: string, action: string) => actions.run(key, () => controlMedia(action));
  const sendKey = (key: TvKey) => {
    const call = tvKeyCall(kind, view.entity, config.remoteId, key);
    if (!call) return;
    actions.run(`key:${key}`, () => runtime.callService(call.domain, call.service, call.data));
  };

  const togglePower = () => {
    if (view.unavailable) return;
    const off = tvPowerOffCall(view, mediaPlayerId, config.remoteId);
    power.request(!power.value, () =>
      power.value
        ? runtime.callService(off.domain, off.service, off.data)
        : runtime.callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
    );
  };
  const idle = !view.isOn || view.unavailable;
  const powerWaiting = !power.value && !tvCanPower(kind, view);
  const flavor = tvRemoteFlavor(kind, view.entity);
  const hasRemote = tvHasRemote(flavor, config.remoteId);
  const has = (key: TvKey) => hasRemote && tvHasKey(flavor, key);
  const failed =
    actions.failed !== null ||
    playing.error ||
    volume.failed ||
    media.error ||
    power.error ||
    channel.failed ||
    appLaunch.failed;
  const statusLine = failed
    ? testi.comandoNonRiuscito
    : view.unavailable
      ? tvStatus(view)
      : !view.isOn
        ? testi.spento
        : [view.appName || testi.schermataHome, view.title].filter(Boolean).join(' · ');

  const currentSource = attrString(view.entity, 'source').toLowerCase();
  const isCurrentSource = (name: string) =>
    view.isOn &&
    (view.appName.toLowerCase() === name.toLowerCase() || currentSource === name.toLowerCase());

  return {
    id,
    kind,
    runtime,
    config,
    mediaPlayerId,
    view,
    actions,
    playing,
    power,
    channel,
    volume,
    media,
    now,
    appLaunch,
    controlMedia,
    run,
    sendKey,
    togglePower,
    idle,
    powerWaiting,
    hasRemote,
    has,
    failed,
    statusLine,
    isCurrentSource,
  };
}

export type TvDetailsState = ReturnType<typeof useTvDetailsState>;
