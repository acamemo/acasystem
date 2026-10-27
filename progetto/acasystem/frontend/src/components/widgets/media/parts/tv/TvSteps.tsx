import { Heading } from '@/components/primitives';
import { testi } from '../../testi';
import { StepPair } from '../Controls';
import type { TvDetailsState } from './useTvDetailsState';

/** Volume − / + and channel − / + : the single-pointer alternatives to the knob and the key. */
export function TvSteps({ tv }: { tv: TvDetailsState }) {
  const { id, volume, channel, actions, config } = tv;
  const showSteps = volume.mode !== null || Boolean(config.remoteId);
  return (
    <>
      {showSteps && (
        <section className="aca-media-section" aria-labelledby={`${id}-volume`}>
          <Heading level={3} size="sm" id={`${id}-volume`}>
            {testi.volume}
          </Heading>
          <StepPair
            labels={[testi.volumeGiu, testi.volumeSu]}
            busy={[actions.busy === 'volume_down', actions.busy === 'volume_up']}
            onStep={(direction) =>
              direction > 0
                ? tv.run('volume_up', 'volume_up')
                : tv.run('volume_down', 'volume_down')
            }
          />
        </section>
      )}
      {channel.available && (
        <section className="aca-media-section" aria-labelledby={`${id}-canali`}>
          <Heading level={3} size="sm" id={`${id}-canali`}>
            {testi.canali}
          </Heading>
          <StepPair
            labels={[testi.canaleMeno, testi.canalePiu]}
            busy={[channel.busy.down, channel.busy.up]}
            onStep={channel.step}
          />
        </section>
      )}
    </>
  );
}
