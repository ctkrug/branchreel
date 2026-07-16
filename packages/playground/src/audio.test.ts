import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundEngine } from "./audio.js";

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("SoundEngine", () => {
  it("defaults to unmuted when localStorage is unavailable", () => {
    const engine = new SoundEngine();
    expect(engine.isMuted).toBe(false);
  });

  it("does not throw calling any SFX method without a DOM window", () => {
    const engine = new SoundEngine();
    expect(() => {
      engine.hover();
      engine.choice();
      engine.branchLit();
      engine.storyEnd();
    }).not.toThrow();
  });

  it("toggleMuted flips state and returns the new value", () => {
    const engine = new SoundEngine();
    expect(engine.toggleMuted()).toBe(true);
    expect(engine.isMuted).toBe(true);
    expect(engine.toggleMuted()).toBe(false);
    expect(engine.isMuted).toBe(false);
  });

  describe("with localStorage available", () => {
    beforeEach(() => {
      vi.stubGlobal("localStorage", makeMemoryStorage());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("persists muted state across instances", () => {
      const first = new SoundEngine();
      first.setMuted(true);

      const second = new SoundEngine();
      expect(second.isMuted).toBe(true);
    });

    it("persists unmuted state after toggling back", () => {
      const first = new SoundEngine();
      first.setMuted(true);
      first.setMuted(false);

      const second = new SoundEngine();
      expect(second.isMuted).toBe(false);
    });
  });
});
