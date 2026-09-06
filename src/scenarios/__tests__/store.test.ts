import { describe, expect, it } from 'vitest';
import { ScenarioStore } from '../store';
import { MemoryAdapter } from '../storage';
import { buildShareUrl, decodeShare, encodeShare } from '../urlCodec';

describe('ScenarioStore', () => {
  it('creates, selects, updates, renames, duplicates and removes scenarios', () => {
    const adapter = new MemoryAdapter();
    const store = new ScenarioStore(adapter);
    expect(store.activeFor('vehicle')).toBeNull();
    const s1 = store.ensure('vehicle', { a: 1 }, 'First');
    expect(store.activeFor('vehicle')?.id).toBe(s1.id);
    expect(store.listFor('vehicle')).toHaveLength(1);

    store.update(s1.id, { a: 2 }, 'preset-x');
    expect(store.activeFor('vehicle')?.inputs).toEqual({ a: 2 });
    expect(store.activeFor('vehicle')?.presetId).toBe('preset-x');
    store.update(s1.id, { a: 3 });
    expect(store.activeFor('vehicle')?.presetId).toBeNull();

    store.rename(s1.id, '  Commuter  ');
    expect(store.activeFor('vehicle')?.name).toBe('Commuter');
    store.rename(s1.id, '   ');
    expect(store.activeFor('vehicle')?.name).toBe('Commuter');

    const copy = store.duplicate(s1.id)!;
    expect(copy.name).toBe('Commuter (copy)');
    expect(copy.inputs).toEqual({ a: 3 });
    expect(store.activeFor('vehicle')?.id).toBe(copy.id);
    const copy2 = store.duplicate(s1.id)!;
    expect(copy2.name).toBe('Commuter (copy 2)');

    store.setActive('vehicle', s1.id);
    store.remove(s1.id);
    expect(store.listFor('vehicle')).toHaveLength(2);
    expect(store.activeFor('vehicle')?.id).toBe(copy.id);

    // Scenarios are isolated per calculator.
    store.ensure('rent-buy', { r: 1 });
    expect(store.listFor('vehicle')).toHaveLength(2);
    expect(store.listFor('rent-buy')).toHaveLength(1);
  });

  it('persists through the adapter and reloads', () => {
    const adapter = new MemoryAdapter();
    const store = new ScenarioStore(adapter);
    const s = store.ensure('vehicle', { a: 1 }, 'Saved');
    store.flush();
    const again = new ScenarioStore(adapter);
    expect(again.activeFor('vehicle')?.id).toBe(s.id);
    expect(again.activeFor('vehicle')?.name).toBe('Saved');
  });

  it('clearAll wipes state', () => {
    const adapter = new MemoryAdapter();
    const store = new ScenarioStore(adapter);
    store.ensure('vehicle', { a: 1 });
    store.clearAll();
    expect(store.listFor('vehicle')).toHaveLength(0);
    expect(adapter.load()).toBeNull();
  });
});

describe('urlCodec', () => {
  it('round-trips a scenario including unicode names', () => {
    const token = encodeShare({ calculatorId: 'vehicle', name: 'Émilie’s car — test', inputs: { a: { price: 42000 }, shared: { miles: 12000 } } });
    expect(token).not.toMatch(/[+/=]/);
    const decoded = decodeShare(`#s=${token}`)!;
    expect(decoded.calculatorId).toBe('vehicle');
    expect(decoded.name).toBe('Émilie’s car — test');
    expect(decoded.inputs).toEqual({ a: { price: 42000 }, shared: { miles: 12000 } });
    expect(decodeShare(token)).toEqual(decoded);
  });
  it('rejects garbage safely', () => {
    expect(decodeShare('#s=not-base64!!')).toBeNull();
    expect(decodeShare('#foo')).toBeNull();
    expect(decodeShare('')).toBeNull();
    expect(decodeShare(`#s=${btoa('{"c":1}')}`)).toBeNull();
  });
  it('builds a URL with the hash', () => {
    const url = buildShareUrl({ calculatorId: 'x', name: 'n', inputs: { a: 1 } }, '/calculators/x');
    expect(url).toMatch(/\/calculators\/x#s=[A-Za-z0-9_-]+$/);
  });
});
