import { useEffect, useRef } from 'react';
import type { EntityLike } from '@/@types/ha';

export interface SmartThemeOptions {
  currentTheme: string;
  bgMode: string;
  entities: Record<string, EntityLike | null | undefined>;
  now: Date;
}

/**
 * Custom hook for smart contextual theming based on weather and time of day.
 * Applies CSS custom properties for background gradients when bgMode is 'theme'.
 *
 * @param params.currentTheme - Current theme name
 * @param params.bgMode - Background mode ('theme', 'color', etc.)
 * @param params.entities - Home Assistant entities
 * @param params.now - Current timestamp
 */
export function useSmartTheme({ currentTheme, bgMode, entities, now }: SmartThemeOptions): void {
  const weatherEntityIdRef = useRef<string | null>(null);
  const lastAppliedRef = useRef('');

  useEffect(() => {
    if (currentTheme !== 'contextual' || bgMode !== 'theme') {
      lastAppliedRef.current = '';
      return;
    }

    let weatherEntity = weatherEntityIdRef.current ? entities[weatherEntityIdRef.current] : null;
    if (!weatherEntity?.entity_id?.startsWith('weather.')) {
      weatherEntity = Object.values(entities).find((e) =>
        String(e?.entity_id).startsWith('weather.')
      );
      weatherEntityIdRef.current = weatherEntity?.entity_id || null;
    }

    const weatherState = weatherEntity?.state;
    const sunEntity = entities['sun.sun'];
    const hour = now.getHours();

    let bgGradientFrom: string, bgGradientTo: string, bgPrimary: string;

    if (sunEntity) {
      const isUp = sunEntity.state === 'above_horizon';
      const elevation = Number(sunEntity.attributes?.elevation || 0);

      if (!isUp) {
        bgGradientFrom = '#0f172a';
        bgGradientTo = '#020617';
        bgPrimary = '#020617';
      } else {
        if (elevation < 10) {
          if (hour < 12) {
            bgGradientFrom = '#3b82f6';
            bgGradientTo = '#fdba74';
            bgPrimary = '#1e293b';
          } else {
            bgGradientFrom = '#6366f1';
            bgGradientTo = '#f472b6';
            bgPrimary = '#312e81';
          }
        } else {
          bgGradientFrom = '#38bdf8';
          bgGradientTo = '#3b82f6';
          bgPrimary = '#0f172a';
        }
      }
    } else {
      if (hour >= 6 && hour < 10) {
        bgGradientFrom = '#3b82f6';
        bgGradientTo = '#fdba74';
        bgPrimary = '#1e293b';
      } else if (hour >= 10 && hour < 17) {
        bgGradientFrom = '#38bdf8';
        bgGradientTo = '#3b82f6';
        bgPrimary = '#0f172a';
      } else if (hour >= 17 && hour < 21) {
        bgGradientFrom = '#6366f1';
        bgGradientTo = '#f472b6';
        bgPrimary = '#312e81';
      } else {
        bgGradientFrom = '#0f172a';
        bgGradientTo = '#020617';
        bgPrimary = '#020617';
      }
    }

    if (
      weatherState === 'rainy' ||
      weatherState === 'pouring' ||
      weatherState === 'snowy' ||
      weatherState === 'hail'
    ) {
      bgGradientFrom = '#334155';
      bgGradientTo = '#1e293b';
    } else if (
      weatherState === 'cloudy' ||
      weatherState === 'partlycloudy' ||
      weatherState === 'fog'
    ) {
      bgGradientFrom = '#475569';
      bgGradientTo = '#64748b';
    }

    const nextApplied = `${bgGradientFrom}|${bgGradientTo}|${bgPrimary}`;
    if (lastAppliedRef.current === nextApplied) return;
    lastAppliedRef.current = nextApplied;

    const root = document.documentElement;
    root.style.setProperty('--bg-gradient-from', bgGradientFrom);
    root.style.setProperty('--bg-gradient-to', bgGradientTo);
    root.style.setProperty('--bg-primary', bgPrimary);
  }, [currentTheme, now, entities, bgMode]);
}
