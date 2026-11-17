import { useState, type ReactNode } from 'react';
import { Button, Caption, Heading } from '@/components/primitives';
import { useConfirmedCommand } from '../../hooks/commands';
import { MediaIcon } from '../../icons';
import { MediaChooser } from '../MediaChooser';
import { CommandStatus } from '../Controls';
import { attrString, stringList } from '../../model/entity';
import { MEDIA_FEATURE, declares } from '../../model/features';
import { tvApps, tvInputs } from '../../model/tvApps';
import { tvSoundOutput, tvSoundOutputs } from '../../model/tvSound';
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
  labelOf = (item) => item,
  note = null,
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
  /** The name shown for an item, when it differs from its value. */
  labelOf?: (item: string) => string;
  /** Under the buttons: the message of a choice that did not work. */
  note?: ReactNode;
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
            {labelOf(item)}
          </Button>
        ))}
      </div>
      {note}
    </section>
  );
}

/** Apps (Netflix, Prime Video…), apart from the inputs, only when the TV has some. */
export function TvAppsSection({ tv }: { tv: TvDetailsState }) {
  const { kind, view, mediaPlayerId, appLaunch, powerWaiting } = tv;
  const apps = tvApps(kind, view, mediaPlayerId, tv.browsedApps);
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

/**
 * Sound output of an LG TV (TV speakers, soundbar on HDMI ARC, optical…), only while it is on. The
 * TV says where the sound goes in `sound_output`: the choice waits for that attribute to change,
 * and one the TV does not take (nothing connected there) says so.
 */
export function TvSoundOutputSection({ tv }: { tv: TvDetailsState }) {
  const { view, runtime, mediaPlayerId } = tv;
  const current = tvSoundOutput(view.entity);
  const output = useConfirmedCommand(current, { timeoutMessage: testi.uscitaNonCollegata });
  const outputs = view.isOn ? tvSoundOutputs(view.entity) : [];
  if (outputs.length === 0) return null;
  const names = new Map(outputs.map(({ value, name }) => [value, name]));
  return (
    <ChoiceList
      tv={tv}
      heading={testi.uscitaAudio}
      headingId={`${tv.id}-uscita-audio`}
      items={outputs.map(({ value }) => value)}
      labelOf={(value) => names.get(value) ?? value}
      isCurrent={(value) => current === value}
      prefix="output"
      choose={(value) =>
        output.request(value, () =>
          runtime.callService('webostv', 'select_sound_output', {
            entity_id: mediaPlayerId,
            sound_output: value,
          })
        )
      }
      pending={output.pending ? output.value : null}
      note={
        (output.error || output.timedOut) && (
          <CommandStatus error message={testi.uscitaNonCollegata} />
        )
      }
    />
  );
}

/**
 * «Scegli contenuto» of a TV that can browse its content (BROWSE_MEDIA), while it is on: the same
 * panel as the media player, without the apps (they are in the «App» section).
 */
export function TvChooseSection({ tv }: { tv: TvDetailsState }) {
  const [choosing, setChoosing] = useState(false);
  const { view, mediaPlayerId } = tv;
  if (!view.isOn || !declares(view.entity, MEDIA_FEATURE.BROWSE_MEDIA)) return null;
  return (
    <section className="aca-media-section" aria-label={testi.scegliContenuto}>
      <div className="aca-media-wrap">
        <Button
          variant="control"
          size="md"
          aria-expanded={choosing}
          onClick={() => setChoosing((value) => !value)}
        >
          <MediaIcon name="playlist" size="sm" />
          {testi.scegliContenuto}
        </Button>
      </div>
      {choosing && (
        <>
          <Caption>{testi.scegliContenutoTvNota}</Caption>
          <MediaChooser entityId={mediaPlayerId} open={choosing} forTv />
        </>
      )}
    </section>
  );
}
