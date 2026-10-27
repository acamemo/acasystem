import { Button, Heading } from '@/components/primitives';
import { attrString, stringList } from '../../model/entity';
import { MEDIA_FEATURE, declares } from '../../model/features';
import { tvApps, tvInputs } from '../../model/tvApps';
import { testi } from '../../testi';
import type { TvDetailsState } from './useTvDetailsState';

function ChoiceList({
  tv,
  heading,
  headingId,
  items,
  isCurrent,
  prefix,
  choose,
  pending = null,
  disabled = false,
}: {
  tv: TvDetailsState;
  heading: string;
  headingId: string;
  items: string[];
  isCurrent: (item: string) => boolean;
  prefix: string;
  choose: (item: string) => unknown;
  pending?: string | null;
  disabled?: boolean;
}) {
  return (
    <section className="aca-media-section" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        {heading}
      </Heading>
      <div className="aca-media-wrap">
        {items.map((item) => (
          <Button
            key={item}
            variant="control"
            size="sm"
            aria-pressed={isCurrent(item)}
            loading={tv.actions.busy === `${prefix}:${item}` || pending === item}
            disabled={disabled}
            onClick={() => tv.actions.run(`${prefix}:${item}`, () => choose(item))}
          >
            {item}
          </Button>
        ))}
      </div>
    </section>
  );
}

/** Apps (Netflix, Prime Video…), apart from the inputs, only when the TV has some. */
export function TvAppsSection({ tv }: { tv: TvDetailsState }) {
  const { kind, view, mediaPlayerId, appLaunch, powerWaiting } = tv;
  const apps = tvApps(kind, view, mediaPlayerId);
  if (apps.length === 0) return null;
  return (
    <ChoiceList
      tv={tv}
      heading={testi.app}
      headingId={`${tv.id}-app`}
      items={apps.map((app) => app.name)}
      isCurrent={tv.isCurrentSource}
      prefix="app"
      choose={(name) => {
        const app = apps.find((candidate) => candidate.name === name);
        return app && appLaunch.open(app);
      }}
      // Off and impossible to switch on over the network: faded and inert, with no text.
      pending={appLaunch.waiting}
      disabled={view.unavailable || powerWaiting}
    />
  );
}

/** Inputs (HDMI, TV). */
export function TvInputsSection({ tv }: { tv: TvDetailsState }) {
  const inputs = tvInputs(tv.kind, tv.view);
  if (inputs.length === 0) return null;
  return (
    <ChoiceList
      tv={tv}
      heading={testi.ingressi}
      headingId={`${tv.id}-ingressi`}
      items={inputs}
      isCurrent={tv.isCurrentSource}
      prefix="source"
      choose={(source) =>
        tv.runtime.callService('media_player', 'select_source', {
          entity_id: tv.mediaPlayerId,
          source,
        })
      }
    />
  );
}

/** Sound modes, when the entity declares them. */
export function TvSoundSection({ tv }: { tv: TvDetailsState }) {
  const { view } = tv;
  if (!view.entity) return null;
  const soundModes = declares(view.entity, MEDIA_FEATURE.SELECT_SOUND_MODE)
    ? stringList(view.entity.attributes?.sound_mode_list)
    : [];
  if (soundModes.length === 0) return null;
  const currentSoundMode = attrString(view.entity, 'sound_mode').toLowerCase();
  return (
    <ChoiceList
      tv={tv}
      heading={testi.modalitaAudio}
      headingId={`${tv.id}-audio`}
      items={soundModes}
      isCurrent={(mode) => currentSoundMode === mode.toLowerCase()}
      prefix="sound"
      choose={(mode) =>
        tv.runtime.callService('media_player', 'select_sound_mode', {
          entity_id: tv.mediaPlayerId,
          sound_mode: mode,
        })
      }
    />
  );
}
