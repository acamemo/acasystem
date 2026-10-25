import { useRef, useState, type CSSProperties } from 'react';
import { Body, Button, Segmented } from '@/components/primitives';
import {
  WALLPAPER_HUES,
  photoHue,
  saveWallpaperPhoto,
  wallpaperHueOf,
  type AccentChoice,
  type Appearance,
  type ThemeChoice,
  type WallpaperChoice,
} from '@/utils/appearance';

const themes: Array<{ value: ThemeChoice; label: string }> = [
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
  { value: 'auto', label: 'Automatico' },
];

const accents: Array<{ value: AccentChoice; label: string }> = [
  { value: 'violet', label: 'Viola' },
  { value: 'red', label: 'Rosso' },
  { value: 'cyan', label: 'Ciano' },
  { value: 'orange', label: 'Arancione' },
  { value: 'wallpaper', label: 'Dallo sfondo' },
];

const wallpapers: Array<{ value: Exclude<WallpaperChoice, 'photo'>; label: string }> = [
  { value: 'none', label: 'Nessuno' },
  { value: 'alba', label: 'Alba' },
  { value: 'mare', label: 'Mare' },
  { value: 'bosco', label: 'Bosco' },
  { value: 'tramonto', label: 'Tramonto' },
  { value: 'notte', label: 'Notte' },
];

type HueStyle = CSSProperties & Record<'--k2-accent-hue', string>;

/**
 * Theme, accent and wallpaper of Kit 2 for this device (ADR-0011, REP-20261007-008, -038).
 * The choice is saved in this browser only: every tablet keeps its own; the photo of the
 * wallpaper stays on the device.
 */
export function AppearanceSection({
  appearance,
  onChange,
}: {
  appearance: Appearance;
  onChange: (next: Appearance) => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState(false);
  const hue = wallpaperHueOf(appearance);

  const chooseWallpaper = (wallpaper: Exclude<WallpaperChoice, 'photo'>) => {
    const next: Appearance = { ...appearance, wallpaper };
    delete next.wallpaperHue;
    if (wallpaper !== 'none') next.wallpaperHue = WALLPAPER_HUES[wallpaper];
    // Without a wallpaper there is no hue to take: back to violet.
    if (wallpaper === 'none' && appearance.accent === 'wallpaper') next.accent = 'violet';
    onChange(next);
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(false);
    const saved = await saveWallpaperPhoto(file);
    if (!saved) {
      setPhotoError(true);
      return;
    }
    const measured = await photoHue(file);
    onChange({
      ...appearance,
      wallpaper: 'photo',
      ...(measured !== null ? { wallpaperHue: measured } : {}),
    });
  };

  return (
    <div className="aca-system__stack">
      <Segmented
        label="Tema"
        value={appearance.theme}
        options={themes}
        onChange={(theme) => onChange({ ...appearance, theme })}
      />
      <Body size="sm" tone="muted">
        Automatico segue l’impostazione chiaro/scuro del dispositivo.
      </Body>

      <div className="aca-system__wallpapers" role="group" aria-label="Sfondo">
        {wallpapers.map((wallpaper) => (
          <Button
            key={wallpaper.value}
            variant="control"
            size="md"
            aria-pressed={appearance.wallpaper === wallpaper.value}
            onClick={() => chooseWallpaper(wallpaper.value)}
          >
            <span
              className="aca-system__wallpaper-swatch"
              data-swatch={wallpaper.value}
              aria-hidden="true"
            />
            {wallpaper.label}
          </Button>
        ))}
        <Button
          variant="control"
          size="md"
          aria-pressed={appearance.wallpaper === 'photo'}
          onClick={() => photoInput.current?.click()}
        >
          <span className="aca-system__wallpaper-swatch" data-swatch="photo" aria-hidden="true" />
          Una foto…
        </Button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void choosePhoto(event.target.files?.[0])}
        />
      </div>
      <Body size="sm" tone={photoError ? 'danger' : 'muted'}>
        {photoError
          ? 'La foto non si può salvare in questo browser.'
          : 'Lo sfondo resta dietro le pagine; barre e widget mantengono il loro fondo. La foto resta su questo dispositivo.'}
      </Body>

      <div className="aca-system__accents" role="group" aria-label="Colore d’accento">
        {accents.map((accent) => {
          const fromWallpaper = accent.value === 'wallpaper';
          const style: HueStyle | undefined =
            fromWallpaper && hue !== null ? { '--k2-accent-hue': String(hue) } : undefined;
          return (
            <Button
              key={accent.value}
              variant="control"
              size="md"
              aria-pressed={appearance.accent === accent.value}
              disabled={fromWallpaper && hue === null}
              onClick={() => onChange({ ...appearance, accent: accent.value })}
            >
              {/* Each dot is its own Kit 2 scope with that accent, so it shows its colour. */}
              <span
                className="k2 aca-system__accent-dot"
                data-accent={fromWallpaper ? 'custom' : accent.value}
                style={style}
                aria-hidden="true"
              />
              {accent.label}
            </Button>
          );
        })}
      </div>
      <Body size="sm" tone="muted">
        «Dallo sfondo» prende il colore dominante dello sfondo, come Material You. La scelta vale
        per questo dispositivo e resta salvata in questo browser.
      </Body>
    </div>
  );
}
