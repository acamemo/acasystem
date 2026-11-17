import { ProductTvConsole } from '../../home/tv/ProductTvDetails';
import { tvProductBinding } from '../../home/tv/productTvModel';
import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import type { TvKind } from '../model/tv';
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
import { useTvDetailsState } from '../parts/tv/useTvDetailsState';
import { TvMissing } from './TvDetails';

/**
 * Content of the TV console (Console primitive): the same sections as the sheet in two columns.
 * Left, what the widget has and the player: icon and status, base keys, volume and channel
 * buttons, playback. Right, the remote and the choices: remote, apps, inputs, sound mode, sound output, content.
 * On a narrow screen the columns stack in that order.
 */
function LegacyTvConsole({ kind, ...props }: WidgetDetailsProps & { kind: TvKind }) {
  const tv = useTvDetailsState(kind, props);
  if (!tv.view.entity) return <TvMissing tv={tv} />;
  if (tv.powerSetup.open) return <TvPowerSetupStep tv={tv} />;
  return (
    <ConsoleColumns
      main={
        <>
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
          {/* Volume and channel − / + side by side: the column fits the player without scrolling. */}
          <div className="aca-media-section aca-media-steps-row">
            <TvSteps tv={tv} />
          </div>
          <TvPlayer tv={tv} />
          <CommandStatus error={tv.failed} message={tv.notice} />
        </>
      }
      side={
        <>
          <TvRemote tv={tv} />
          <TvAppsSection tv={tv} />
          <TvInputsSection tv={tv} />
          <TvSoundSection tv={tv} />
          <TvSoundOutputSection tv={tv} />
          <TvChooseSection tv={tv} />
        </>
      }
    />
  );
}

export function TvConsole({ kind, ...props }: WidgetDetailsProps & { kind: TvKind }) {
  if (tvProductBinding(props.settings)) return <ProductTvConsole {...props} kind={kind} />;
  return <LegacyTvConsole kind={kind} {...props} />;
}

export const AndroidTvConsole = (props: WidgetDetailsProps) => (
  <TvConsole kind="android" {...props} />
);
export const AppleTvConsole = (props: WidgetDetailsProps) => <TvConsole kind="apple" {...props} />;
