import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { LocalStorageAdapter, STATE_VERSION, type PersistedState, type Scenario, type StorageAdapter } from './storage';
import { uid } from '../lib/ids';

type Listener = () => void;

/** What React subscribes to. Rebuilt on every change so useSyncExternalStore sees a new identity. */
export interface StoreSnapshot {
  state: PersistedState;
  /** False when writes are failing — scenarios live in memory only for this session. */
  persisting: boolean;
}

export class ScenarioStore {
  private state: PersistedState;
  private snapshot: StoreSnapshot;
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private adapter: StorageAdapter) {
    this.state = adapter.load() ?? { version: STATE_VERSION, scenarios: [], active: {} };
    this.snapshot = { state: this.state, persisting: adapter.isPersisting() };
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): StoreSnapshot => this.snapshot;

  private emit() {
    this.snapshot = { state: this.state, persisting: this.adapter.isPersisting() };
    this.listeners.forEach((l) => l());
  }

  private write() {
    const before = this.adapter.isPersisting();
    this.adapter.save(this.state);
    // A newly failing (or recovered) write changes what we must tell the user.
    if (this.adapter.isPersisting() !== before) this.emit();
  }

  private set(next: PersistedState) {
    this.state = next;
    this.emit();
    if (this.saveTimer !== null) globalThis.clearTimeout(this.saveTimer);
    this.saveTimer = globalThis.setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 120);
  }

  flush() {
    if (this.saveTimer !== null) {
      globalThis.clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.write();
    }
  }

  listFor(calculatorId: string): Scenario[] {
    return this.state.scenarios.filter((s) => s.calculatorId === calculatorId).sort((a, b) => a.createdAt - b.createdAt);
  }

  activeFor(calculatorId: string): Scenario | null {
    const id = this.state.active[calculatorId];
    return this.state.scenarios.find((s) => s.id === id && s.calculatorId === calculatorId) ?? this.listFor(calculatorId)[0] ?? null;
  }

  create<I>(calculatorId: string, name: string, inputs: I, presetId: string | null = null, activate = true): Scenario<I> {
    const now = Date.now();
    const s: Scenario<I> = { id: uid(), calculatorId, name, inputs, presetId, createdAt: now, updatedAt: now };
    this.set({
      ...this.state,
      scenarios: [...this.state.scenarios, s as Scenario],
      active: activate ? { ...this.state.active, [calculatorId]: s.id } : this.state.active,
    });
    return s;
  }

  ensure<I>(calculatorId: string, defaults: I, name = 'My scenario'): Scenario<I> {
    const existing = this.activeFor(calculatorId);
    if (existing) return existing as Scenario<I>;
    return this.create(calculatorId, name, defaults);
  }

  setActive(calculatorId: string, id: string) {
    if (this.state.active[calculatorId] === id) return;
    this.set({ ...this.state, active: { ...this.state.active, [calculatorId]: id } });
  }

  update<I>(id: string, inputs: I, presetId?: string | null) {
    this.set({
      ...this.state,
      scenarios: this.state.scenarios.map((s) => (s.id === id ? { ...s, inputs, presetId: presetId === undefined ? null : presetId, updatedAt: Date.now() } : s)),
    });
  }

  rename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.set({ ...this.state, scenarios: this.state.scenarios.map((s) => (s.id === id ? { ...s, name: trimmed, updatedAt: Date.now() } : s)) });
  }

  duplicate(id: string): Scenario | null {
    const src = this.state.scenarios.find((s) => s.id === id);
    if (!src) return null;
    const siblings = this.listFor(src.calculatorId);
    const copyName = nextCopyName(src.name, siblings.map((s) => s.name));
    return this.create(src.calculatorId, copyName, JSON.parse(JSON.stringify(src.inputs)), src.presetId);
  }

  remove(id: string) {
    const src = this.state.scenarios.find((s) => s.id === id);
    if (!src) return;
    const remaining = this.state.scenarios.filter((s) => s.id !== id);
    const active = { ...this.state.active };
    if (active[src.calculatorId] === id) {
      const next = remaining.filter((s) => s.calculatorId === src.calculatorId).sort((a, b) => a.createdAt - b.createdAt)[0];
      if (next) active[src.calculatorId] = next.id;
      else delete active[src.calculatorId];
    }
    this.set({ ...this.state, scenarios: remaining, active });
  }

  clearAll() {
    this.set({ version: STATE_VERSION, scenarios: [], active: {} });
    this.adapter.clear();
  }
}

function nextCopyName(name: string, existing: string[]): string {
  const base = name.replace(/\s\(copy( \d+)?\)$/, '');
  let candidate = `${base} (copy)`;
  let n = 2;
  while (existing.includes(candidate)) candidate = `${base} (copy ${n++})`;
  return candidate;
}

let singleton: ScenarioStore | null = null;
export function getStore(): ScenarioStore {
  if (!singleton) singleton = new ScenarioStore(new LocalStorageAdapter());
  return singleton;
}

/** React binding for one calculator's scenarios. */
export function useScenarios<I>(calculatorId: string, defaults: I, defaultName = 'My scenario') {
  const store = getStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const state = snapshot.state;

  // Make sure there is always an active scenario for this calculator.
  useEffect(() => {
    if (!store.activeFor(calculatorId)) store.ensure(calculatorId, defaults, defaultName);
  }, [calculatorId, defaults, defaultName, store, state]);

  useEffect(() => {
    const onHide = () => store.flush();
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      store.flush();
    };
  }, [store]);

  const scenarios = useMemo(() => store.listFor(calculatorId) as Scenario<I>[], [store, calculatorId, state]);
  const active = useMemo(() => (store.activeFor(calculatorId) as Scenario<I> | null) ?? null, [store, calculatorId, state]);

  const setInputs = useCallback(
    (inputs: I, presetId?: string | null) => {
      const cur = store.activeFor(calculatorId);
      if (cur) store.update(cur.id, inputs, presetId);
    },
    [store, calculatorId],
  );

  return {
    scenarios,
    active,
    setInputs,
    /** False when this browser is refusing to store data — the UI warns instead of losing work quietly. */
    persisting: snapshot.persisting,
    totalSaved: state.scenarios.length,
    clearAll: () => store.clearAll(),
    select: (id: string) => store.setActive(calculatorId, id),
    create: (name: string, inputs: I, presetId: string | null = null) => store.create(calculatorId, name, inputs, presetId),
    rename: (id: string, name: string) => store.rename(id, name),
    duplicate: (id: string) => store.duplicate(id),
    remove: (id: string) => store.remove(id),
    reset: (id: string) => store.update(id, defaults, null),
  };
}
