// ─── multiplayer.js tests ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SK, storeShared, readShared, deleteShared } from '../engine/multiplayer.js';

// ─── SK key helpers ───────────────────────────────────────────────────────────

describe('SK', () => {
  it('session key includes code', () => {
    expect(SK.session('ABCD')).toBe('finbot_session_ABCD');
  });

  it('round key includes code', () => {
    expect(SK.round('ABCD')).toBe('finbot_round_ABCD');
  });

  it('p1Choice key includes code', () => {
    expect(SK.p1Choice('ABCD')).toBe('finbot_p1choice_ABCD');
  });

  it('p2Choice key includes code', () => {
    expect(SK.p2Choice('ABCD')).toBe('finbot_p2choice_ABCD');
  });

  it('p1Worth key includes code', () => {
    expect(SK.p1Worth('ABCD')).toBe('finbot_p1worth_ABCD');
  });

  it('p2Worth key includes code', () => {
    expect(SK.p2Worth('ABCD')).toBe('finbot_p2worth_ABCD');
  });

  it('disconnect key includes code', () => {
    expect(SK.disconnect('ABCD')).toBe('finbot_dc_ABCD');
  });

  it('different codes produce different keys', () => {
    expect(SK.session('AAAA')).not.toBe(SK.session('BBBB'));
  });

  it('all 7 key types exist', () => {
    expect(Object.keys(SK)).toHaveLength(7);
  });

  it('all key functions accept arbitrary code strings', () => {
    const code = 'X1Y2';
    Object.values(SK).forEach(fn => {
      const key = fn(code);
      expect(typeof key).toBe('string');
      expect(key).toContain(code);
    });
  });
});

// ─── storeShared / readShared / deleteShared (via localStorage mock) ─────────

describe('storeShared / readShared / deleteShared', () => {
  // Minimal localStorage mock for Node environment
  const store = {};
  const localStorageMock = {
    getItem:    (k) => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  beforeEach(() => {
    globalThis.window = { localStorage: localStorageMock };
    globalThis.localStorage = localStorageMock;
    localStorageMock.clear();
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('storeShared writes and readShared retrieves an object', async () => {
    await storeShared('test_key', { foo: 'bar', n: 42 });
    const result = await readShared('test_key');
    expect(result).toEqual({ foo: 'bar', n: 42 });
  });

  it('readShared returns null for missing key', async () => {
    const result = await readShared('nonexistent_key');
    expect(result).toBeNull();
  });

  it('deleteShared removes a key', async () => {
    await storeShared('del_key', { x: 1 });
    await deleteShared('del_key');
    const result = await readShared('del_key');
    expect(result).toBeNull();
  });

  it('stores and retrieves nested objects', async () => {
    const payload = { scenario: { title: 'Test', choices: [{ id: 'A' }] }, round: 3 };
    await storeShared('nested_key', payload);
    const result = await readShared('nested_key');
    expect(result).toEqual(payload);
  });

  it('overwrites existing values', async () => {
    await storeShared('ow_key', { v: 1 });
    await storeShared('ow_key', { v: 2 });
    const result = await readShared('ow_key');
    expect(result.v).toBe(2);
  });

  it('stores booleans and numbers', async () => {
    await storeShared('bool_key', true);
    expect(await readShared('bool_key')).toBe(true);

    await storeShared('num_key', 99);
    expect(await readShared('num_key')).toBe(99);
  });

  it('stores null explicitly', async () => {
    await storeShared('null_key', null);
    // JSON.parse(JSON.stringify(null)) = null — should round-trip
    const result = await readShared('null_key');
    expect(result).toBeNull();
  });

  it('does not throw when localStorage throws', async () => {
    // Simulate broken storage
    const broken = {
      getItem:    () => { throw new Error('quota'); },
      setItem:    () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('quota'); },
    };
    globalThis.window = { localStorage: broken };
    globalThis.localStorage = broken;

    await expect(storeShared('k', { v: 1 })).resolves.not.toThrow();
    await expect(readShared('k')).resolves.toBeNull();
    await expect(deleteShared('k')).resolves.not.toThrow();
  });
});
