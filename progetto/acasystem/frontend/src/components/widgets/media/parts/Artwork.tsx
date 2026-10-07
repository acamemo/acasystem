import { useState } from 'react';
import { MaterialLayers, materialClass } from '@/components/primitives';
import { MediaIcon, type MediaIconName } from '../icons';

export interface ArtworkProps {
  /** Sanitised image URL; null shows the placeholder. */
  src: string | null;
  /** Empty for decorative artwork next to its text. */
  alt?: string;
  /** Placeholder glyph when there is no image or it fails to load. */
  icon: MediaIconName;
  /** small 3rem, medium 5rem, large 8rem, tall (height of the row), window (fills), video (16:9). */
  variant?: 'compact' | 'small' | 'medium' | 'large' | 'tall' | 'window' | 'video';
  /** contain for app logos, cover for covers and photos. */
  fit?: 'cover' | 'contain';
  className?: string;
}

/**
 * Artwork set into a recessed well of the kit. A missing or broken image never shows the browser's
 * broken icon: the well keeps the placeholder glyph instead.
 */
export function Artwork({
  src,
  alt = '',
  icon,
  variant = 'compact',
  fit = 'cover',
  className,
}: ArtworkProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = Boolean(src) && failed !== src;
  return (
    <div
      className={materialClass(
        { behavior: 'well', shape: 'rounded', size: 'inherit' },
        'aca-media-art',
        variant !== 'compact' && `aca-media-art--${variant}`,
        className
      )}
      data-artwork={showImage ? 'image' : 'placeholder'}
    >
      <MaterialLayers element="div" contentClassName="aca-media-art__content">
        {showImage && src ? (
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={
              fit === 'contain' ? 'aca-media-art__img aca-media-art__img--contain' : 'aca-media-art__img'
            }
            onError={() => setFailed(src)}
          />
        ) : (
          <MediaIcon name={icon} size={variant === 'compact' || variant === 'small' ? 'lg' : 'xl'} />
        )}
      </MaterialLayers>
    </div>
  );
}
