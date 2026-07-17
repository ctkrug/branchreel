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

function makeFakeOscillator() {
  return {
    type: "sine" as OscillatorType,
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(function (this: unknown, node: unknown) {
      return node;
    }),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeFakeGain() {
  return {
    gain: { value: 0, exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(function (this: unknown, node: unknown) {
      return node;
    }),
  };
}

function makeFakeAudioContext(state: "running" | "suspended" = "running") {
  const oscillators: ReturnType<typeof makeFakeOscillator>[] = [];
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      ctx.state = "running";
      return Promise.resolve();
    }),
    createOscillator: vi.fn(() => {
      const osc = makeFakeOscillator();
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => makeFakeGain()),
  };
  return { ctx, oscillators };
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

  describe("with a fake AudioContext", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function stubWindowWithAudioContext(state: "running" | "suspended" = "running") {
      const { ctx, oscillators } = makeFakeAudioContext(state);
      const AudioContextCtor = vi.fn(function () {
        return ctx;
      });
      vi.stubGlobal("window", { AudioContext: AudioContextCtor });
      return { ctx, oscillators, AudioContextCtor };
    }

    it("creates exactly one AudioContext across multiple SFX calls", () => {
      const { AudioContextCtor } = stubWindowWithAudioContext();
      const engine = new SoundEngine();
      engine.hover();
      engine.choice();
      expect(AudioContextCtor).toHaveBeenCalledTimes(1);
    });

    it("resumes a suspended context before playing", () => {
      const { ctx } = stubWindowWithAudioContext("suspended");
      const engine = new SoundEngine();
      engine.hover();
      expect(ctx.resume).toHaveBeenCalledTimes(1);
    });

    it("plays no oscillator while muted", () => {
      const { ctx } = stubWindowWithAudioContext();
      const engine = new SoundEngine();
      engine.setMuted(true);
      engine.hover();
      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });

    it("hover plays a single quiet high tick", () => {
      const { oscillators } = stubWindowWithAudioContext();
      new SoundEngine().hover();
      expect(oscillators).toHaveLength(1);
      expect(oscillators[0].type).toBe("sine");
      expect(oscillators[0].frequency.value).toBe(660);
    });

    it("branchLit sweeps the oscillator frequency upward", () => {
      const { oscillators } = stubWindowWithAudioContext();
      new SoundEngine().branchLit();
      expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(oscillators[0].frequency.linearRampToValueAtTime).toHaveBeenCalledWith(880, 0.15);
    });

    it("storyEnd plays a three-note chord", () => {
      const { oscillators } = stubWindowWithAudioContext();
      new SoundEngine().storyEnd();
      expect(oscillators).toHaveLength(3);
      expect(oscillators.map((o) => o.frequency.value)).toEqual([440, 554, 660]);
    });

    it("falls back to webkitAudioContext when AudioContext is unavailable", () => {
      const { ctx } = makeFakeAudioContext();
      const WebkitCtor = vi.fn(function () {
        return ctx;
      });
      vi.stubGlobal("window", { webkitAudioContext: WebkitCtor });
      new SoundEngine().hover();
      expect(WebkitCtor).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when neither AudioContext constructor is available", () => {
      vi.stubGlobal("window", {});
      expect(() => new SoundEngine().hover()).not.toThrow();
    });
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
