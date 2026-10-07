// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  buildHashedAssetFallbackMap,
  hashedAssetKey,
  resolveHashedAssetFallback,
} from '../services/frontendAssets.ts';

describe('hashed asset fallback', () => {
  it('keys only hashed .js and .css files', () => {
    expect(hashedAssetKey('index-AbC123.js')).toBe('index.js');
    expect(hashedAssetKey('vendor-react-9f8e.CSS')).toBe('vendor-react.css');
    expect(hashedAssetKey('logo-abc.png')).toBeNull();
    expect(hashedAssetKey('index.js')).toBeNull();
    expect(hashedAssetKey('-abc.js')).toBeNull();
  });

  it('maps stale hashes to the current file', () => {
    const fallbackMap = buildHashedAssetFallbackMap([
      'index-NEW.js',
      'index-NEW.css',
      'logo-1.svg',
      'plain.js',
    ]);
    expect(Object.fromEntries(fallbackMap)).toEqual({
      'index.js': 'index-NEW.js',
      'index.css': 'index-NEW.css',
    });

    expect(resolveHashedAssetFallback('/index-OLD.js', fallbackMap)).toBe('index-NEW.js');
    expect(resolveHashedAssetFallback('/nested/index-OLD.css', fallbackMap)).toBe('index-NEW.css');
    // Same file, unknown stem, unhashed name, other extensions: no fallback.
    expect(resolveHashedAssetFallback('/index-NEW.js', fallbackMap)).toBeNull();
    expect(resolveHashedAssetFallback('/other-OLD.js', fallbackMap)).toBeNull();
    expect(resolveHashedAssetFallback('/index.js', fallbackMap)).toBeNull();
    expect(resolveHashedAssetFallback('/logo-2.svg', fallbackMap)).toBeNull();
    expect(resolveHashedAssetFallback('', fallbackMap)).toBeNull();
  });
});
