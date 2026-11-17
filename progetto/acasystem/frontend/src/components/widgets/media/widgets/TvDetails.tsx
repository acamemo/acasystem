import { ProductTvDetails } from '../../home/tv/ProductTvDetails';
import { tvProductBinding } from '../../home/tv/productTvModel';
import { Body } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import type { TvKind } from '../model/tv';
import { testi } from '../testi';
import { CommandStatus } from '../parts/Controls';
import {
  TvAppsSection,
  TvChooseSection,
  TvInputsSection,
  TvSoundOutputSection,
  TvSoundSection,
} from '../parts/tv/TvChoices';
import { TvFace } from '../parts/tv/TvFace';
import { TvPowerSetupAction, TvPowerSetupStep } from '../parts/tv/TvPowerSetup';
import { TvLinkHint } from '../parts/tv/TvLinkHint';
import { TvPlayer } from '../parts/tv/TvPlayer';
import { TvRemote } from '../parts/tv/TvRemote';
import { TvSteps } from '../parts/tv/TvSteps';
import { useTvDetailsState, type TvDetailsState } from '../parts/tv/useTvDetailsState';

/** What the details show when the TV is not there (not configured, or gone from Home Assistant). */
export function TvMissing({ tv }: { tv: TvDetailsState }) {
  return (
    <div className="aca-media-details">
      <Body tone="muted" role="status">
        {tv.mediaPlayerId ? testi.dispositivoNonTrovato : testi.dispositivoNonConfigurato}
      </Body>
    </div>
  );
}

/**
 * Details of the TV widgets in one column (the sheet), laid out like the widget and then
 * everything it does not have: the TV icon and status; the three base keys (power, volume knob,
 * channel key); the missing controls (volume and channel buttons, sources, sound mode, remote with
 * D-pad, keys, colours and numbers); and last the player (artwork, title, seek, previous,
 * play/pause, stop, next, shuffle, repeat). Each section only when the entity supports it.
 * An LG TV adds the sound output, and a TV that can browse its content adds «Scegli contenuto».
 * The console (TvConsole) lays out the same sections in two columns.
 */
function LegacyTvDetails({ kind, ...props }: WidgetDetailsProps & { kind: TvKind }) {
  const tv = useTvDetailsState(kind, props);
  if (!tv.view.entity) return <TvMissing tv={tv} />;
  if (tv.powerSetup.open) return <TvPowerSetupStep tv={tv} />;
  return (
    <div className="aca-media-details">
      <TvLinkHint guard={tv.castGuard} />
      <section className="aca-media-section" aria-label={tv.view.deviceName}>
        <TvFace
          tv={tv}
          size="xl"
          statusLine={tv.statusLine}
          failed={tv.failed}
          showName={false}
          className="aca-media-section"
        />
      </section>
      <TvPowerSetupAction tv={tv} />
      <TvSteps tv={tv} />
      <TvAppsSection tv={tv} />
      <TvInputsSection tv={tv} />
      <TvSoundSection tv={tv} />
      <TvSoundOutputSection tv={tv} />
      <TvChooseSection tv={tv} />
      <TvRemote tv={tv} />
      <TvPlayer tv={tv} />
      <CommandStatus error={tv.failed} message={tv.notice} />
    </div>
  );
}

export function TvDetails({ kind, ...props }: WidgetDetailsProps & { kind: TvKind }) {
  if (tvProductBinding(props.settings)) return <ProductTvDetails {...props} kind={kind} />;
  return <LegacyTvDetails kind={kind} {...props} />;
}

export const AndroidTvDetails = (props: WidgetDetailsProps) => (
  <TvDetails kind="android" {...props} />
);
export const AppleTvDetails = (props: WidgetDetailsProps) => <TvDetails kind="apple" {...props} />;
