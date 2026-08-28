import "@testing-library/jest-dom/vitest";

/**
 * Node 26 defines its own `localStorage` global, which shadows the one jsdom
 * provides and throws unless the process was started with --localstorage-file.
 * Tests want the jsdom implementation, so install a plain in-memory store.
 */
class MemoryStorage {
  #entries = new Map();

  get length() {
    return this.#entries.size;
  }
  key(index) {
    return [...this.#entries.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#entries.has(String(key)) ? this.#entries.get(String(key)) : null;
  }
  setItem(key, value) {
    this.#entries.set(String(key), String(value));
  }
  removeItem(key) {
    this.#entries.delete(String(key));
  }
  clear() {
    this.#entries.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: new MemoryStorage(),
});
