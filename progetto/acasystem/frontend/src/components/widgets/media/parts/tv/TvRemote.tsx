import { useState } from 'react';
import { Button, Heading, Numeric } from '@/components/primitives';
import { MediaIcon } from '../../icons';
import { TV_DIGITS, digitKey } from '../../model/tvRemote';
import { testi } from '../../testi';
import { RoundKey, TextKey, type LabelledKey } from './TvKeys';
import type { TvDetailsState } from './useTvDetailsState';

/** Keys next to the D-pad; each is shown only if the platform of the TV can send it. */
const MAIN_KEYS: LabelledKey[] = [
  { key: 'back', label: testi.indietro, icon: 'back' },
  { key: 'home', label: testi.home, icon: 'home' },
  { key: 'menu', label: testi.menu, icon: 'menu' },
  { key: 'info', label: testi.info, icon: 'info' },
  { key: 'guide', label: testi.guida },
  { key: 'source', label: testi.sorgente },
  { key: 'exit', label: testi.esci },
];

/** Colour keys: text only, the theme has no red/green/yellow tokens. */
const COLOUR_KEYS: LabelledKey[] = [
  { key: 'red', label: testi.rosso },
  { key: 'green', label: testi.verde },
  { key: 'yellow', label: testi.giallo },
  { key: 'blue', label: testi.blu },
];

/** Remote with D-pad, keys, and «Altri tasti» (colours and numbers). */
export function TvRemote({ tv }: { tv: TvDetailsState }) {
  const [moreKeys, setMoreKeys] = useState(false);
  if (!tv.hasRemote) return null;
  const { id, has, actions } = tv;
  const showColours = has('red');
  const showNumbers = has('digit0');
  return (
    <section className="aca-media-section" aria-labelledby={`${id}-telecomando`}>
      <Heading level={3} size="sm" id={`${id}-telecomando`}>
        {testi.telecomando}
      </Heading>
      <div className="aca-media-dpad">
        <RoundKey tv={tv} keyName="up" label={testi.su} icon="up" className="aca-media-dpad__up" />
        <RoundKey
          tv={tv}
          keyName="left"
          label={testi.sinistra}
          icon="left"
          className="aca-media-dpad__left"
        />
        <RoundKey tv={tv} keyName="ok" label={testi.ok} className="aca-media-dpad__ok" />
        <RoundKey
          tv={tv}
          keyName="right"
          label={testi.destra}
          icon="right"
          className="aca-media-dpad__right"
        />
        <RoundKey
          tv={tv}
          keyName="down"
          label={testi.giu}
          icon="down"
          className="aca-media-dpad__down"
        />
      </div>
      <div className="aca-media-keygrid">
        {MAIN_KEYS.filter(({ key }) => has(key)).map((item) => (
          <TextKey key={item.key} tv={tv} item={item} />
        ))}
      </div>
      {(showColours || showNumbers) && (
        <>
          <Button
            variant="control"
            size="sm"
            aria-expanded={moreKeys}
            aria-controls={`${id}-altri-tasti`}
            onClick={() => setMoreKeys((value) => !value)}
          >
            <MediaIcon name={moreKeys ? 'chevronUp' : 'chevronDown'} size="sm" />
            {testi.altriTasti}
          </Button>
          <div id={`${id}-altri-tasti`} hidden={!moreKeys} className="aca-media-section">
            {moreKeys && showColours && (
              <div className="aca-media-keygrid">
                {COLOUR_KEYS.map((item) => (
                  <TextKey key={item.key} tv={tv} item={item} />
                ))}
              </div>
            )}
            {moreKeys && showNumbers && (
              <div className="aca-media-numpad" role="group" aria-label={testi.tastiNumerici}>
                {TV_DIGITS.map((digit) => (
                  <Button
                    key={digit}
                    variant="control"
                    shape="circle"
                    size="lg"
                    className={digit === '0' ? 'aca-media-numpad__zero' : undefined}
                    aria-label={testi.cifra(digit)}
                    loading={actions.busy === `key:${digitKey(digit)}`}
                    onClick={() => tv.sendKey(digitKey(digit))}
                  >
                    <Numeric>{digit}</Numeric>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
