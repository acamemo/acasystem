import { Body, Button, Caption, Heading, IconText } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useConfirmedCommand, useServiceActions } from '../hooks/commands';
import { MediaIcon, type MediaIconName } from '../icons';
import { resolveImage } from '../model/entity';
import { detailsTarget, resolveTv, type TvKind } from '../model/tv';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { CommandStatus, PowerButton } from '../parts/Controls';
import { readTvConfig, tvStatus } from './TvWidget';

interface RemoteKey {
  command: string;
  label: string;
  icon: MediaIconName;
}

/** Remote commands of the legacy modals: Android TV (adb keys) and Apple TV (pyatv). */
const REMOTE: Record<
  TvKind,
  { up: string; down: string; left: string; right: string; ok: string; keys: RemoteKey[] }
> = {
  android: {
    up: 'DPAD_UP',
    down: 'DPAD_DOWN',
    left: 'DPAD_LEFT',
    right: 'DPAD_RIGHT',
    ok: 'DPAD_CENTER',
    keys: [
      { command: 'BACK', label: testi.indietro, icon: 'back' },
      { command: 'HOME', label: testi.home, icon: 'home' },
      { command: 'MENU', label: testi.menu, icon: 'menu' },
    ],
  },
  apple: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    ok: 'select',
    keys: [
      { command: 'menu', label: testi.indietro, icon: 'back' },
      { command: 'home', label: testi.home, icon: 'home' },
    ],
  },
};

/**
 * Details of the TV widgets: artwork and title, transport, the remote (D-pad, keys, volume) when a
 * `remote.*` entity is configured, the Apple TV apps (select_source), power and mute.
 */
export function TvDetails({ kind, id, settings }: WidgetDetailsProps & { kind: TvKind }) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings);
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
  const muted = useConfirmedCommand(view.muted);

  if (!view.entity) {
    return (
      <div className="aca-media-details">
        <Body tone="muted" role="status">
          {mediaPlayerId ? testi.dispositivoNonTrovato : testi.dispositivoNonConfigurato}
        </Body>
      </div>
    );
  }

  const controlMedia = (action: string) =>
    runtime.callService('media_player', action, {
      entity_id: detailsTarget(action, view, mediaPlayerId),
    });
  const run = (key: string, action: string) => actions.run(key, () => controlMedia(action));
  const sendCommand = (command: string) => {
    if (!config.remoteId) return;
    actions.run(`remote:${command}`, () =>
      runtime.callService('remote', 'send_command', { entity_id: config.remoteId, command })
    );
  };
  const togglePower = () => {
    const service = power.value ? 'turn_off' : 'turn_on';
    power.request(!power.value, () =>
      runtime.callService('media_player', service, { entity_id: mediaPlayerId })
    );
  };
  const toggleMute = () => {
    const target = !muted.value;
    muted.request(target, () =>
      runtime.callService('media_player', 'volume_mute', {
        entity_id: mediaPlayerId,
        is_volume_muted: target,
      })
    );
  };

  const picture = resolveImage(view.picture, runtime.getEntityImageUrl);
  const logo = resolveImage(view.logo, runtime.getEntityImageUrl);
  const remote = REMOTE[kind];
  const failed = actions.failed !== null || playing.error || power.error || muted.error;
  const keyButton = (
    key: string,
    command: string,
    label: string,
    icon: MediaIconName,
    area?: string
  ) => (
    <Button
      key={key}
      variant="control"
      shape="circle"
      size="lg"
      className={area}
      aria-label={label}
      loading={actions.busy === `remote:${command}`}
      onClick={() => sendCommand(command)}
    >
      <MediaIcon name={icon} size="md" />
    </Button>
  );

  const volumeButtons = (
    <>
      <Button
        variant="control"
        size="md"
        aria-label={testi.volumeGiu}
        onClick={() => run('volume_down', 'volume_down')}
      >
        <MediaIcon name="minus" size="sm" />
        {testi.volume}
      </Button>
      <Button
        variant="control"
        size="md"
        aria-label={testi.volumeSu}
        onClick={() => run('volume_up', 'volume_up')}
      >
        <MediaIcon name="add" size="sm" />
        {testi.volume}
      </Button>
    </>
  );

  const powerControl = (
    <PowerButton
      on={power.value}
      action={power.value ? 'turn_off' : 'turn_on'}
      pending={power.pending}
      onClick={togglePower}
    />
  );

  return (
    <div className="aca-media-details">
      <section className="aca-media-section" aria-label={view.deviceName}>
        <div className="aca-media-row aca-media-row--between">
          <IconText
            icon={view.isOn ? 'activity' : 'info'}
            iconTone={view.isOn ? 'active' : undefined}
            iconSize="sm"
            tone={view.unavailable ? 'danger' : 'muted'}
          >
            {power.pending ? testi.inAttesa : testi.stato(tvStatus(view))}
          </IconText>
          {(kind === 'apple' || config.remoteId) && powerControl}
        </div>
        {(picture ?? logo) && (
          <Artwork
            src={picture ?? logo}
            alt={view.title}
            icon="tv"
            fit={picture ? 'cover' : 'contain'}
            variant="video"
          />
        )}
        <div className="aca-media-row">
          {!(picture ?? logo) && <Artwork src={null} icon="tv" variant="small" />}
          <div className="aca-media-text aca-media-grow">
            <Caption tone="active">{view.appName || testi.schermataHome}</Caption>
            <Heading level={3} size="md">
              {view.title || testi.nienteInRiproduzione}
            </Heading>
          </div>
        </div>
        <div className="aca-media-transport">
          <Button
            variant="control"
            shape="circle"
            size="md"
            aria-label={testi.precedente}
            loading={actions.busy === 'previous'}
            onClick={() => run('previous', 'media_previous_track')}
          >
            <MediaIcon name="previous" size="md" />
          </Button>
          <Button
            variant="primary"
            shape="circle"
            size="lg"
            aria-label={
              kind === 'apple' ? testi.playPausa : playing.value ? testi.pausa : testi.riproduci
            }
            loading={playing.pending}
            onClick={() => playing.request(!playing.value, () => controlMedia('media_play_pause'))}
          >
            <MediaIcon name={playing.value ? 'pause' : 'play'} size="md" />
          </Button>
          <Button
            variant="control"
            shape="circle"
            size="md"
            aria-label={testi.successivo}
            loading={actions.busy === 'next'}
            onClick={() => run('next', 'media_next_track')}
          >
            <MediaIcon name="next" size="md" />
          </Button>
        </div>
      </section>

      {kind === 'apple' && view.sources.length > 0 && (
        <section className="aca-media-section" aria-labelledby={`${id}-app`}>
          <Heading level={3} size="sm" id={`${id}-app`}>
            {testi.app}
          </Heading>
          <div className="aca-media-wrap">
            {view.sources.map((source) => (
              <Button
                key={source}
                variant="control"
                size="sm"
                aria-pressed={view.appName.toLowerCase() === source.toLowerCase()}
                loading={actions.busy === `source:${source}`}
                onClick={() =>
                  actions.run(`source:${source}`, () =>
                    runtime.callService('media_player', 'select_source', {
                      entity_id: mediaPlayerId,
                      source,
                    })
                  )
                }
              >
                {source}
              </Button>
            ))}
          </div>
        </section>
      )}

      {(config.remoteId || kind === 'apple') && (
        <section className="aca-media-section" aria-labelledby={`${id}-telecomando`}>
          <Heading level={3} size="sm" id={`${id}-telecomando`}>
            {testi.telecomando}
          </Heading>
          {config.remoteId && (
            <>
              <div className="aca-media-dpad">
                {keyButton('up', remote.up, testi.su, 'up', 'aca-media-dpad__up')}
                {keyButton('left', remote.left, testi.sinistra, 'left', 'aca-media-dpad__left')}
                <Button
                  variant="control"
                  shape="circle"
                  size="lg"
                  className="aca-media-dpad__ok"
                  aria-label={testi.ok}
                  loading={actions.busy === `remote:${remote.ok}`}
                  onClick={() => sendCommand(remote.ok)}
                >
                  {testi.ok}
                </Button>
                {keyButton('right', remote.right, testi.destra, 'right', 'aca-media-dpad__right')}
                {keyButton('down', remote.down, testi.giu, 'down', 'aca-media-dpad__down')}
              </div>
              <div className="aca-media-keys">
                {remote.keys.map((key) => (
                  <Button
                    key={key.command}
                    variant="control"
                    size="md"
                    loading={actions.busy === `remote:${key.command}`}
                    onClick={() => sendCommand(key.command)}
                  >
                    <MediaIcon name={key.icon} size="sm" />
                    {key.label}
                  </Button>
                ))}
              </div>
            </>
          )}
          {(config.remoteId || kind === 'apple') && (
            <div className="aca-media-keys">{volumeButtons}</div>
          )}
          {kind === 'apple' && (
            <div className="aca-media-wrap">
              <Button
                variant="control"
                size="md"
                aria-pressed={muted.value}
                loading={muted.pending}
                onClick={toggleMute}
              >
                <MediaIcon name="mute" size="sm" />
                {muted.value ? testi.riattivaAudio : testi.muto}
              </Button>
            </div>
          )}
        </section>
      )}

      <CommandStatus error={failed} />
    </div>
  );
}

export const AndroidTvDetails = (props: WidgetDetailsProps) => (
  <TvDetails kind="android" {...props} />
);
export const AppleTvDetails = (props: WidgetDetailsProps) => <TvDetails kind="apple" {...props} />;
