import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import type { TvKind } from '../model/tv';
import { CommandStatus } from '../parts/Controls';
import { TvAppsSection, TvInputsSection, TvSoundSection } from '../parts/tv/TvChoices';
import { TvFace } from '../parts/tv/TvFace';
import { TvPlayer } from '../parts/tv/TvPlayer';
import { TvRemote } from '../parts/tv/TvRemote';
import { TvSteps } from '../parts/tv/TvSteps';
import { useTvDetailsState } from '../parts/tv/useTvDetailsState';
import { TvMissing } from './TvDetails';

/**
 * Content of the TV console (Console primitive): the same sections as the sheet in two columns.
 * Left, what the widget has and the player: icon and status, base keys, volume and channel
 * buttons, playback. Right, the remote and the choices: remote, apps, inputs, sound mode.
 * On a narrow screen the columns stack in that order.
 */
export function TvConsole({ kind, ...props }: WidgetDetailsProps & { kind: TvKind }) {
  const tv = useTvDetailsState(kind, props);
  if (!tv.view.entity) return <TvMissing tv={tv} />;
  return (
    <ConsoleColumns
      main={
        <>
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
          {/* Volume and channel − / + side by side: the column fits the player without scrolling. */}
          <div className="aca-media-section aca-media-steps-row">
            <TvSteps tv={tv} />
          </div>
          <TvPlayer tv={tv} />
          <CommandStatus error={tv.failed} />
        </>
      }
      side={
        <>
          <TvRemote tv={tv} />
          <TvAppsSection tv={tv} />
          <TvInputsSection tv={tv} />
          <TvSoundSection tv={tv} />
        </>
      }
    />
  );
}

export const AndroidTvConsole = (props: WidgetDetailsProps) => (
  <TvConsole kind="android" {...props} />
);
export const AppleTvConsole = (props: WidgetDetailsProps) => <TvConsole kind="apple" {...props} />;
