import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOptionalHomeStartup } from './HomeStartupContext';

interface Assets { ready: boolean; fontFallback: boolean; photoFallback: boolean }
const initial: Assets = { ready: false, fontFallback: false, photoFallback: false };
const setFallbacks = (value: Pick<Assets, 'fontFallback' | 'photoFallback'>) => {
  document.documentElement.toggleAttribute('data-aca-home-font-fallback', value.fontFallback);
  document.documentElement.toggleAttribute('data-aca-home-photo-fallback', value.photoFallback);
};

/** Real visible resources only; accepted fallback stays fixed for this authenticated lifecycle. */
export function useHomeStartupAssets(element: HTMLElement | null, scope: string, eligible: boolean) {
  const startup = useOptionalHomeStartup();
  const localFallbacks = useRef({ font: false, photo: false });
  const held = startup?.assetFallbacks ?? localFallbacks;
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    held.current.font = false; held.current.photo = false;
    setFallbacks({ fontFallback: false, photoFallback: false });
    setAttempt((value) => value + 1);
  }, [held]);
  const decision = useRef<{ scope: string; element: HTMLElement | null; attempt: number; value: Assets | null }>({ scope, element, attempt, value: null });
  const [state, setState] = useState<Assets & { scope: string; element: HTMLElement | null; attempt: number }>({ ...initial, scope: '', element: null, attempt: -1 });
  if (decision.current.scope !== scope || decision.current.element !== element || decision.current.attempt !== attempt) {
    decision.current = { scope, element, attempt, value: null };
  }
  useLayoutEffect(() => {
    if (held.current.font || held.current.photo) setFallbacks({ fontFallback: held.current.font, photoFallback: held.current.photo });
    return () => {
      if (!startup) setFallbacks({ fontFallback: false, photoFallback: false });
    };
  }, [startup, held]);
  useEffect(() => {
    if (!element || !eligible) return undefined;
    if (decision.current.value) { setState({ ...decision.current.value, scope, element, attempt }); return undefined; }
    let active = true;
    let fontDone = false, photoDone = false;
    let fontFallback = held.current.font, photoFallback = held.current.photo;
    setState({ ...initial, scope, element, attempt });
    const finish = () => {
      if (!active || !fontDone || !photoDone) return;
      const value = { ready: true, fontFallback, photoFallback };
      decision.current.value = value;
      held.current.font ||= fontFallback; held.current.photo ||= photoFallback;
      setFallbacks(value);
      setState({ ...value, scope, element, attempt });
    };
    const acceptFonts = (fallback: boolean) => {
      if (!active || fontDone) return;
      fontDone = true; fontFallback = fallback; finish();
    };
    const acceptPhoto = (fallback: boolean) => {
      if (!active || photoDone) return;
      photoDone = true; photoFallback = fallback; finish();
    };
    const timer = setTimeout(() => { acceptFonts(true); acceptPhoto(true); }, 3000);
    const fonts = document.fonts;
    if (fontFallback || !fonts || typeof fonts.load !== 'function') acceptFonts(true);
    else {
      const used = new Map<string, Set<string>>();
      for (const node of [element, ...element.querySelectorAll<HTMLElement>('*')]) {
        const page = node.closest('.aca-pager__page');
        if (page && !page.classList.contains('is-current')) continue;
        let visible = true;
        for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (ancestor.hidden || style.display === 'none' || style.visibility === 'hidden') { visible = false; break; }
          if (ancestor === element) break;
        }
        if (!visible) continue;
        const text = [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.textContent ?? '').join('');
        if (!text.trim()) continue;
        const style = getComputedStyle(node);
        const font = `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${style.fontSize || '16px'} ${style.fontFamily || 'sans-serif'}`;
        const glyphs = used.get(font) ?? new Set<string>();
        for (const glyph of text) glyphs.add(glyph);
        used.set(font, glyphs);
      }
      void Promise.all([...used].map(([font, glyphs]) => fonts.load(font, [...glyphs].join(''))))
        .then(() => acceptFonts(false), () => acceptFonts(true));
    }
    let image: HTMLImageElement | null = null;
    const configuredPhoto = getComputedStyle(document.documentElement).getPropertyValue('--aca-white-photo').trim();
    if (photoFallback) acceptPhoto(true);
    else if (!configuredPhoto || configuredPhoto === 'none') acceptPhoto(false);
    else {
      const backdrop = getComputedStyle(document.body, '::before');
      if (backdrop.display === 'none' || backdrop.visibility === 'hidden') acceptPhoto(false);
      else {
        const source = /url\(["']?(.*?)["']?\)/.exec(backdrop.backgroundImage)?.[1];
        if (!source || typeof Image !== 'function') acceptPhoto(true);
        else {
          image = new Image();
          let decoding = false;
          const loaded = () => {
            if (!active || photoDone || decoding || !image) return;
            decoding = true;
            const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve();
            void decoded.then(() => acceptPhoto(false), () => acceptPhoto(true));
          };
          image.onload = loaded;
          image.onerror = () => acceptPhoto(true);
          image.src = source;
          if (image.complete && image.naturalWidth > 0) loaded();
        }
      }
    }
    return () => {
      active = false; clearTimeout(timer);
      if (image) { image.onload = null; image.onerror = null; }
    };
  }, [element, scope, eligible, held, attempt]);
  const current = state.scope === scope && state.element === element && state.attempt === attempt ? state : initial;
  return { ...current, retry };
}
