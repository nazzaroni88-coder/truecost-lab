/**
 * Persistence abstraction. The app only talks to a StorageAdapter, so cloud/account saving can be
 * added later by implementing the same interface (e.g. a RemoteAdapter that syncs on save()).
 */

export interface Scenario<I = unknown> {
  id: string;
  calculatorId: string;
  name: string;
  inputs: I;
  presetId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedState {
  version: number;
  scenarios: Scenario[];
  /** Active scenario id per calculator. */
  active: Record<string, string>;
}

export interface StorageAdapter {
  load(): PersistedState | null;
  save(state: PersistedState): void;
  clear(): void;
}

export const STATE_VERSION = 1;
const KEY = 'truecost-lab:v1';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key: string = KEY) {}
  load(): PersistedState | null {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedState;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.scenarios)) return null;
      return migrate(parsed);
    } catch {
      return null;
    }
  }
  save(state: PersistedState): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      /* quota exceeded or private mode — fail silently; the session still works in memory */
    }
  }
  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
  }
}

export class MemoryAdapter implements StorageAdapter {
  private state: PersistedState | null = null;
  load() {
    return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
  }
  save(state: PersistedState) {
    this.state = JSON.parse(JSON.stringify(state));
  }
  clear() {
    this.state = null;
  }
}

function migrate(state: PersistedState): PersistedState {
  // Future schema migrations go here, keyed on state.version.
  return { version: STATE_VERSION, scenarios: state.scenarios ?? [], active: state.active ?? {} };
}
