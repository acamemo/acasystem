import { useState } from 'react';
import { UtilityIcon } from '../shared/UtilityIcon';
import type { DeviceFamily } from '@/utils/devices/classify';
import { useBrandLogo } from './useBrandLogo';

/**
 * The logo of the brand of a device, or the icon of its family where there is no logo. The image is
 * decoration (`alt=""`): the name of the device is the text next to it.
 */
export function BrandLogo({
  handler,
  family,
  size = 'md',
}: {
  handler: string;
  family: DeviceFamily | null;
  size?: 'md' | 'lg';
}) {
  const { url, icon } = useBrandLogo(handler, family);
  const [broken, setBroken] = useState<string | null>(null);
  if (url && broken !== url) {
    return (
      <img
        src={url}
        alt=""
        className={`discovery-logo discovery-logo--${size}`}
        draggable={false}
        onError={() => setBroken(url)}
      />
    );
  }
  return <UtilityIcon name={icon} size={size} />;
}
