// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  createCachedAuthError,
  describeError,
  isHomeAssistantReachabilityError,
  isInvalidAuthError,
} from '../helpers/homeAssistantErrors.ts';
import { normalizeHomeAssistantUrl } from '../helpers/homeAssistantUrls.ts';
import { safeParseJson } from '../helpers/json.ts';
import { readProperty } from '../helpers/objects.ts';

describe('Home Assistant URL helpers', () => {
  it('normalizes http(s) URLs and rejects the rest', () => {
    expect(normalizeHomeAssistantUrl(' https://ha.example:8123/?x=1#top ')).toBe(
      'https://ha.example:8123'
    );
    expect(normalizeHomeAssistantUrl('http://ha.local/base/')).toBe('http://ha.local/base');
    expect(normalizeHomeAssistantUrl('ws://ha.local')).toBeNull();
    expect(normalizeHomeAssistantUrl('not a url')).toBeNull();
    expect(normalizeHomeAssistantUrl(undefined)).toBeNull();
  });
});

describe('Home Assistant error helpers', () => {
  it('describes websocket codes, errors and plain values', () => {
    expect(describeError(1)).toBe('ERR_CANNOT_CONNECT (code 1)');
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('text')).toBe('text');
    expect(describeError(42)).toBe('42');
    expect(describeError(null)).toBe('unknown error');
  });

  it('classifies auth and reachability failures', () => {
    expect(isInvalidAuthError(2)).toBe(true);
    expect(isInvalidAuthError(new Error('auth_invalid'))).toBe(true);
    expect(isInvalidAuthError(new Error('ECONNREFUSED'))).toBe(false);
    expect(isHomeAssistantReachabilityError(3)).toBe(true);
    expect(isHomeAssistantReachabilityError(new Error('self signed certificate'))).toBe(true);
    expect(isHomeAssistantReachabilityError(new Error('Invalid auth'))).toBe(false);
  });

  it('wraps non-Error values for the invalid-auth cache', () => {
    const error = new Error('x');
    expect(createCachedAuthError(error)).toBe(error);
    expect(createCachedAuthError(undefined).message).toBe('Home Assistant authentication failed');
  });

  it('keeps cached HA auth codes classified as invalid auth (SEC-1)', () => {
    expect(createCachedAuthError(2).message).toBe('ERR_INVALID_AUTH (code 2)');
    expect(isInvalidAuthError(createCachedAuthError(2))).toBe(true);
    expect(isInvalidAuthError(createCachedAuthError(6))).toBe(true); // ERR_INVALID_AUTH_CALLBACK
    expect(isHomeAssistantReachabilityError(createCachedAuthError(2))).toBe(false);
  });
});

describe('generic helpers', () => {
  it('parses JSON with a fallback, reading null as null', () => {
    expect(safeParseJson('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeParseJson('{broken', {})).toEqual({});
    expect(safeParseJson(null, {})).toBeNull();
  });

  it('reads properties like optional chaining', () => {
    expect(readProperty({ a: 1 }, 'a')).toBe(1);
    expect(readProperty(new Error('m'), 'message')).toBe('m');
    expect(readProperty('text', 'message')).toBeUndefined();
    expect(readProperty(null, 'a')).toBeUndefined();
  });
});
