import { describe, it, expect } from 'vitest';
import { themes } from '../config/themes';

function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)
    .map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('themes', () => {
  it.each(['dark', 'light'])(
    'mantiene leggibili testi e selezioni della HOME nel tema %s',
    (name) => {
      const colors = themes[name].colors;
      for (const key of ['--text-primary', '--text-secondary', '--neu-active-ink']) {
        expect(contrast(colors[key], colors['--neu-surface']), key).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(colors['--neu-accent-ink'], colors['--accent-color'])).toBeGreaterThanOrEqual(
        4.5
      );
    }
  );
  it('exports a non-empty themes object', () => {
    expect(themes).toBeDefined();
    expect(Object.keys(themes).length).toBeGreaterThan(0);
  });

  it('each theme has required CSS variables', () => {
    const requiredVars = ['--bg-primary', '--glass-bg', '--text-primary', '--accent-color'];
    for (const [name, theme] of Object.entries(themes)) {
      for (const v of requiredVars) {
        expect(theme.colors, `${name} missing ${v}`).toHaveProperty(v);
      }
    }
  });
});
