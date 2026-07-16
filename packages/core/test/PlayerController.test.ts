import { describe, expect, it, vi } from "vitest";
import { PlayerController } from "../src/PlayerController.js";
import type { VideoHost } from "../src/PlayerController.js";
import type { BranchGraph } from "../src/types.js";

/**
 * A minimal `VideoHost` fake: a real `EventTarget` plus the src/time/
 * play/pause surface, with a `fireEvent` helper to simulate the video
 * element reaching a timecode or its natural end. No jsdom required —
 * this exercises the same branch-switching logic a real <video> would
 * drive through.
 */
class FakeVideoHost extends EventTarget implements VideoHost {
  src = "";
  currentTime = 0;
  played = false;
  loadCalls = 0;

  play(): void {
    this.played = true;
  }

  pause(): void {
    this.played = false;
  }

  load(): void {
    this.loadCalls += 1;
  }

  fireEvent(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}

function makeGraph(): BranchGraph {
  return {
    start: "intro",
    nodes: [
      {
        id: "intro",
        src: "intro.mp4",
        end: 10,
        choices: [
          { id: "brave", label: "Open the door", target: "hallway" },
          { id: "cautious", label: "Turn back", target: "ending-safe" },
        ],
      },
      { id: "hallway", src: "hallway.mp4" },
      { id: "ending-safe", src: "ending-safe.mp4" },
    ],
  };
}

function makeController(graph = makeGraph()) {
  const host = new FakeVideoHost();
  const preloadHosts: FakeVideoHost[] = [];
  const controller = new PlayerController(host, graph, {
    createPreloadHost: () => {
      const h = new FakeVideoHost();
      preloadHosts.push(h);
      return h;
    },
  });
  return { host, controller, preloadHosts };
}

describe("PlayerController", () => {
  it("loads the start node's src on construction", () => {
    const { host, controller } = makeController();
    expect(host.src).toBe("intro.mp4");
    expect(controller.current.id).toBe("intro");
  });

  it("preloads every choice target as soon as the node starts", () => {
    const { preloadHosts } = makeController();
    expect(preloadHosts.map((h) => h.src).sort()).toEqual([
      "ending-safe.mp4",
      "hallway.mp4",
    ]);
    expect(preloadHosts.every((h) => h.loadCalls === 1)).toBe(true);
  });

  it("emits a choice event once the node's end timecode is reached", () => {
    const { host, controller } = makeController();
    const onChoice = vi.fn();
    controller.addEventListener("choice", onChoice);

    host.currentTime = 10;
    host.fireEvent("timeupdate");

    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(host.played).toBe(false);
  });

  it("does not fire choice before the end timecode", () => {
    const { host, controller } = makeController();
    const onChoice = vi.fn();
    controller.addEventListener("choice", onChoice);

    host.currentTime = 9.9;
    host.fireEvent("timeupdate");

    expect(onChoice).not.toHaveBeenCalled();
  });

  it("falls back to the ended event when no end timecode is set", () => {
    const graph = makeGraph();
    delete graph.nodes[1].end;
    const { host, controller } = makeController(graph);
    controller.choose("brave");

    const onEnd = vi.fn();
    controller.addEventListener("end", onEnd);
    host.fireEvent("ended");

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("jump-cuts the host to the chosen target synchronously", () => {
    const { host, controller } = makeController();
    host.currentTime = 10;
    host.fireEvent("timeupdate");

    const target = controller.choose("brave");

    expect(target.id).toBe("hallway");
    expect(host.src).toBe("hallway.mp4");
    expect(host.played).toBe(true);
    expect(controller.history).toEqual(["intro", "hallway"]);
  });

  it("dispatches a branch event with the new node and history", () => {
    const { host, controller } = makeController();
    host.currentTime = 10;
    host.fireEvent("timeupdate");

    const onBranch = vi.fn();
    controller.addEventListener("branch", onBranch);
    controller.choose("brave");

    expect(onBranch).toHaveBeenCalledTimes(1);
    const detail = onBranch.mock.calls[0][0].detail;
    expect(detail.node.id).toBe("hallway");
    expect(detail.history).toEqual(["intro", "hallway"]);
  });

  it("two different choices from the same start diverge in history", () => {
    const first = makeController();
    first.host.currentTime = 10;
    first.host.fireEvent("timeupdate");
    first.controller.choose("brave");

    const second = makeController();
    second.host.currentTime = 10;
    second.host.fireEvent("timeupdate");
    second.controller.choose("cautious");

    expect(first.controller.history).toEqual(["intro", "hallway"]);
    expect(second.controller.history).toEqual(["intro", "ending-safe"]);
  });

  it("emits end and never choice for a terminal node", () => {
    const graph = makeGraph();
    const { host, controller } = makeController(graph);
    host.currentTime = 10;
    host.fireEvent("timeupdate");
    controller.choose("cautious");

    const onChoice = vi.fn();
    const onEnd = vi.fn();
    controller.addEventListener("choice", onChoice);
    controller.addEventListener("end", onEnd);
    host.fireEvent("ended");

    expect(onChoice).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("still switches src when a preload host errors instead of throwing", () => {
    const graph = makeGraph();
    const { host, controller, preloadHosts } = makeController(graph);

    const hallwayPreload = preloadHosts.find((h) => h.src === "hallway.mp4")!;
    hallwayPreload.fireEvent("error");

    expect(() => controller.choose("brave")).not.toThrow();
    expect(host.src).toBe("hallway.mp4");
  });

  it("dispose removes host listeners so further events are ignored", () => {
    const { host, controller } = makeController();
    const onChoice = vi.fn();
    controller.addEventListener("choice", onChoice);

    controller.dispose();
    host.currentTime = 10;
    host.fireEvent("timeupdate");

    expect(onChoice).not.toHaveBeenCalled();
  });
});
