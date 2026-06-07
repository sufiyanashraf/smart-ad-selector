import '@testing-library/jest-dom';

// ─── localStorage polyfill for jsdom ────────────────────────────
// jsdom provides a localStorage object but some versions don't fully
// implement Storage methods. This ensures a working localStorage in tests.

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = String(value);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
