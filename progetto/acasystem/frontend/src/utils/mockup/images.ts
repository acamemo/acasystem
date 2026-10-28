/**
 * Pictures of the demo mode (`#/mockup`): camera frames and media artwork drawn locally as inline
 * SVG data URLs, so nothing is requested from the network (REP-20261028-005, K1).
 */

const dataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Hue (0-359) that a text always maps to, so a given camera or album keeps its colour. */
export function hueOf(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 360;
  }
  return hash;
}

/** A still frame of a camera: a night-time house front with the name of the camera. */
export function cameraFrameUrl(label: string): string {
  const hue = hueOf(label);
  const text = escapeXml(label);
  return dataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
      `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue} 35% 18%)"/><stop offset="1" stop-color="hsl(${hue} 30% 32%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="640" height="360" fill="url(#sky)"/>` +
      `<rect y="270" width="640" height="90" fill="hsl(${hue} 20% 14%)"/>` +
      `<path d="M120 270V170l130-70 130 70v100z" fill="hsl(${hue} 25% 24%)"/>` +
      `<rect x="215" y="195" width="70" height="75" fill="hsl(${hue} 60% 62%)" opacity="0.85"/>` +
      `<rect x="330" y="200" width="120" height="70" fill="hsl(${hue} 25% 20%)"/>` +
      `<circle cx="540" cy="70" r="26" fill="hsl(${hue} 20% 88%)" opacity="0.8"/>` +
      `<text x="24" y="40" fill="white" font-family="sans-serif" font-size="22" opacity="0.9">${text}</text>` +
      `<circle cx="610" cy="30" r="6" fill="#d33"/>` +
      `</svg>`
  );
}

/** Cover art of a track: a coloured square with a disc and the first letter of the title. */
export function artworkUrl(title: string): string {
  const hue = hueOf(title);
  const letter = escapeXml((title.trim()[0] ?? '♪').toUpperCase());
  return dataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue} 55% 42%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 60% 28%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="400" height="400" fill="url(#bg)"/>` +
      `<circle cx="200" cy="200" r="130" fill="none" stroke="white" stroke-opacity="0.25" stroke-width="2"/>` +
      `<circle cx="200" cy="200" r="90" fill="none" stroke="white" stroke-opacity="0.25" stroke-width="2"/>` +
      `<circle cx="200" cy="200" r="26" fill="white" fill-opacity="0.3"/>` +
      `<text x="200" y="228" fill="white" fill-opacity="0.85" font-family="sans-serif" font-size="80" text-anchor="middle">${letter}</text>` +
      `</svg>`
  );
}

/** A small floor plan for the map of the robot vacuum. */
export function floorPlanUrl(): string {
  return dataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">` +
      `<rect width="400" height="300" fill="hsl(210 15% 22%)"/>` +
      `<path d="M30 30h190v120H30zM220 30h150v120H220zM30 150h120v120H30zM150 150h220v120H150z" ` +
      `fill="none" stroke="hsl(210 20% 70%)" stroke-width="3"/>` +
      `</svg>`
  );
}

/** The picture a path of Home Assistant stands for, or null when it is not one of the demo's. */
export function demoImageFor(
  path: string,
  /** Name of an entity, so a camera frame carries the name the house gave it. */
  nameOf?: (entityId: string) => string | undefined
): string | null {
  const camera = /\/api\/camera_proxy(?:_stream)?\/([\w.]+)/.exec(path);
  if (camera?.[1]) {
    const fallback = camera[1].split('.').pop()?.replace(/_/g, ' ') ?? 'Videocamera';
    return cameraFrameUrl(
      nameOf?.(camera[1]) ?? fallback.charAt(0).toUpperCase() + fallback.slice(1)
    );
  }
  const media = /\/api\/(?:media_player_proxy|image_proxy)\/([\w.]+)(?:\?([^#]*))?/.exec(path);
  if (media?.[1]) {
    // `?t=` carries the title of the track, so every track has its own cover.
    const title = new URLSearchParams(media[2] ?? '').get('t');
    return artworkUrl(
      title ?? nameOf?.(media[1]) ?? media[1].split('.').pop()?.replace(/_/g, ' ') ?? 'Musica'
    );
  }
  if (path.startsWith('data:')) return path;
  return null;
}

/** A plain tile for the map of the Sistema page: the demo does not ask OpenStreetMap for any. */
export function mapTileUrl(): string {
  return dataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">` +
      `<rect width="256" height="256" fill="hsl(210 18% 88%)"/>` +
      `<path d="M0 128h256M128 0v256" stroke="hsl(210 18% 80%)" stroke-width="2"/>` +
      `</svg>`
  );
}
