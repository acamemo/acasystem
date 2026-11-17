import { useState } from 'react';
import { MediaIcon } from '../../icons';
import { useTvBrandLogo } from '../../hooks/useTvBrandLogo';
import type { TvView } from '../../model/tv';

/**
 * Next to the name of a TV: the logo of its brand where Home Assistant has one, the TV icon
 * otherwise. The image is decoration (`alt=""`): the name of the TV is the text beside it.
 */
export function TvBrandMark({ view }: { view: TvView }) {
  const logo = useTvBrandLogo(view);
  const [broken, setBroken] = useState<string | null>(null);
  if (logo && broken !== logo) {
    return (
      <img
        src={logo}
        alt=""
        className="aca-media-brand"
        data-tv-brand="logo"
        draggable={false}
        onError={() => setBroken(logo)}
      />
    );
  }
  return <MediaIcon name="tv" size="md" />;
}
