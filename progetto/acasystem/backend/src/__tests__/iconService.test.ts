// @vitest-environment node

import { mdiLightbulbOn, mdiNumeric1Box } from '@mdi/js';
import { describe, expect, it } from 'vitest';
import { findMdiIconPath, kebabToMdiKey, listMdiIcons } from '../services/iconService.ts';

describe('icon service', () => {
  it('lists every icon, sorted, without a query', () => {
    const icons = listMdiIcons('');
    expect(icons.length).toBeGreaterThan(5000);
    expect(icons.every((icon) => icon.startsWith('mdi:'))).toBe(true);
    expect([...icons].sort((a, b) => a.localeCompare(b))).toEqual(icons);
  });

  it('filters by substring and caps the results at 500', () => {
    expect(listMdiIcons('lightbulb-on')).toContain('mdi:lightbulb-on');
    expect(listMdiIcons('a')).toHaveLength(500);
    expect(listMdiIcons('no-such-icon-anywhere')).toEqual([]);
  });

  it('finds paths by kebab name and by the camelCase fallback', () => {
    expect(findMdiIconPath('lightbulb-on')).toBe(mdiLightbulbOn);
    // The kebab form of mdiNumeric1Box is "numeric1-box"; "numeric-1-box" needs the fallback.
    expect(kebabToMdiKey('numeric-1-box')).toBe('mdiNumeric1Box');
    expect(findMdiIconPath('numeric-1-box')).toBe(mdiNumeric1Box);
    expect(findMdiIconPath('numeric-1-box')).toBe(mdiNumeric1Box);
    expect(findMdiIconPath('no-such-icon')).toBeNull();
  });
});
