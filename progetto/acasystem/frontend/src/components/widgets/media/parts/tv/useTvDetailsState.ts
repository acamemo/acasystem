import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useConfirmedCommand, useNow, useServiceActions } from '../../hooks/commands';
import { useCastPowerGuard } from '../../hooks/useCastPowerGuard';
import { useMediaControls } from '../../hooks/useMediaControls';
import { useTvAppLaunch } from '../../hooks/useTvAppLaunch';
import { useTvBrowsedApps } from '../../hooks/useTvBrowsedApps';
import { useTvChannel } from '../../hooks/useTvChannel';
import { useTvPower } from '../../hooks/useTvPower';
import { useTvPowerSetup } from '../../hooks/useTvPowerSetup';
import { useTvVolume } from '../../hooks/useTvVolume';
import { useTvWake } from '../../hooks/useTvWake';
import { attrString } from '../../model/entity';
import { MEDIA_FEATURE, declares } from '../../model/features';
import {
  detailsTarget,
  resolveTv,
  tvPowerOffCall,
  tvPowerWaiting,
  tvStatusLine,
  type TvKind,
} from '../../model/tv';
import { tvHasKey, tvHasRemote, tvKeyCall, tvRemoteFlavor, type TvKey } from '../../model/tvRemote';
import { testi } from '../../testi';
import { readTvConfig } from '../../widgets/TvWidget';

/**
 * Everything the sections of the TV details share (sheet and console alike): the resolved TV,
 * the command hooks and the few values several sections read. The sections stay small and show
 * only what the entity supports; the logic lives here once.
 */
export function useTvDetailsState(kind: TvKind, { id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings, runtime.entities);
  const mediaPlayerId = config.mediaPlayerId;
  // An LG webOS TV that is off reports `unavailable`: «Spento» when it can be woken.
  const canWake = useTvWake(runtime.entities[mediaPlayerId]);
  // «Configura l'accensione»: the power-on step of the TV, opened in place.
  const powerSetup = useTvPowerSetup(runtime.entities[mediaPlayerId]);
  const view = resolveTv(
    kind,
    runtime.entities,
    id,
    mediaPlayerId,
    config.linkedMediaPlayers,
    runtime.customNames,
    { canWake }
  );
  const actions = useServiceActions();
  const playing = useConfirmedCommand(view.isPlaying);
  const power = useTvPower(view.isOn);
  const channel = useTvChannel(kind, view, config.remoteId);
  const volume = useTvVolume(kind, view, mediaPlayerId, Boolean(config.remoteId));
  // Seek, shuffle and repeat of the player that is shown (a linked player, when it is playing).
  const media = useMediaControls(view.displayId);
  const now = useNow(1000, view.isPlaying);
  // The apps an Android TV remote lists when browsed replace the fixed list; read while it is on.
  const browsedApps = useTvBrowsedApps(
    runtime.conn,
    mediaPlayerId,
    view.isOn &&
      view.entity?.attributes?.platform === 'androidtv_remote' &&
      declares(view.entity, MEDIA_FEATURE.BROWSE_MEDIA)
  );
  // An app tapped with the TV off switches it on first (power key pending), then opens.
  const castGuard = useCastPowerGuard(config.castBrand);
  const appLaunch = useTvAppLaunch(view.isOn, runtime.callService, () => {
    // A Cast-only TV is not switched on from here: the message says how to connect it.
    if (castGuard.block()) return undefined;
    return power.request(true, () =>
      runtime.callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
    );
  });

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
    if (castGuard.block()) return;
    const off = tvPowerOffCall(view, mediaPlayerId, config.remoteId);
    power.request(!power.confirmed, () =>
      power.confirmed
        ? runtime.callService(off.domain, off.service, off.data)
        : runtime.callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
    );
  };
  const idle = !view.isOn || view.unavailable;
  const powerWaiting = tvPowerWaiting(kind, view, power.confirmed);
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
    appLaunch.failed ||
    power.timedOut !== null;
  // The message of a request the TV never confirmed says more than the generic failure.
  const notice = power.timedOut ?? testi.comandoNonRiuscito;
  const statusLine = failed ? notice : tvStatusLine(view);

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
    castGuard,
    powerSetup,
    view,
    actions,
    playing,
    power,
    channel,
    volume,
    media,
    now,
    appLaunch,
    browsedApps,
    controlMedia,
    run,
    sendKey,
    togglePower,
    idle,
    powerWaiting,
    hasRemote,
    has,
    failed,
    notice,
    statusLine,
    isCurrentSource,
  };
}

export type TvDetailsState = ReturnType<typeof useTvDetailsState>;
