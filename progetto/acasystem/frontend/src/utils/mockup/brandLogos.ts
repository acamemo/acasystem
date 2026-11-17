/**
 * Stand-in brand logos of the demo (`GET /dispositivi/loghi/:domain`): neutral SVG wordmarks
 * drawn here, never the trademarks of the brands. The real server serves the logos that Home
 * Assistant keeps. The dark variant (`?tema=scuro`) has light letters.
 */
const WORDS: Readonly<Record<string, string>> = {
  webostv: 'LG',
  samsungtv: 'SAMSUNG',
  apple_tv: 'Apple TV',
};

/** The wordmark of a demo brand as an SVG image, or null when the demo has none for it. */
export function mockBrandLogo(domain: string, dark: boolean): Blob | null {
  const word = Object.hasOwn(WORDS, domain) ? WORDS[domain] : undefined;
  if (!word) return null;
  const ink = dark ? '#e8edf2' : '#2b3138';
  // A viewBox tight around the word, so the logo fills the well it is set in.
  const size = 40;
  const width = Math.round(word.length * size * 0.7 + 12);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 56">` +
    `<text x="${width / 2}" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" ` +
    `font-size="${size}" font-weight="700" fill="${ink}">${word}</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
