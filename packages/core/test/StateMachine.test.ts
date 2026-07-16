import { describe, expect, it } from "vitest";
import { BranchStateMachine } from "../src/StateMachine.js";
import type { BranchGraph } from "../src/types.js";

function makeGraph(): BranchGraph {
  return {
    start: "intro",
    nodes: [
      {
        id: "intro",
        src: "intro.mp4",
        choices: [
          { id: "brave", label: "Open the door", target: "hallway" },
          { id: "cautious", label: "Turn back", target: "ending-safe" },
        ],
      },
      {
        id: "hallway",
        src: "hallway.mp4",
        choices: [{ id: "onward", label: "Keep going", target: "ending-twist" }],
      },
      { id: "ending-safe", src: "ending-safe.mp4" },
      { id: "ending-twist", src: "ending-twist.mp4" },
    ],
  };
}

describe("BranchStateMachine", () => {
  it("starts at the graph's start node", () => {
    const machine = new BranchStateMachine(makeGraph());
    expect(machine.current.id).toBe("intro");
    expect(machine.history).toEqual(["intro"]);
  });

  it("follows a choice to its target node and records history", () => {
    const machine = new BranchStateMachine(makeGraph());
    const next = machine.choose("brave");
    expect(next.id).toBe("hallway");
    expect(machine.current.id).toBe("hallway");
    expect(machine.history).toEqual(["intro", "hallway"]);
  });

  it("reports terminal nodes as having no choices", () => {
    const machine = new BranchStateMachine(makeGraph());
    machine.choose("cautious");
    expect(machine.isTerminal()).toBe(true);
    expect(machine.choices()).toEqual([]);
  });

  it("supports a full multi-hop path", () => {
    const machine = new BranchStateMachine(makeGraph());
    machine.choose("brave");
    machine.choose("onward");
    expect(machine.current.id).toBe("ending-twist");
    expect(machine.history).toEqual(["intro", "hallway", "ending-twist"]);
  });

  it("throws when choosing an id not offered by the current node", () => {
    const machine = new BranchStateMachine(makeGraph());
    expect(() => machine.choose("onward")).toThrow(/no choice "onward"/);
  });

  it("throws when constructed with a start id missing from nodes", () => {
    const graph = { ...makeGraph(), start: "missing" };
    expect(() => new BranchStateMachine(graph)).toThrow(/start node "missing"/);
  });

  it("throws when constructed with an empty node list", () => {
    expect(() => new BranchStateMachine({ start: "x", nodes: [] })).toThrow(
      /no nodes/,
    );
  });

  it("throws at construction when a choice targets a nonexistent node", () => {
    const graph = makeGraph();
    graph.nodes[0].choices![0].target = "missing";
    expect(() => new BranchStateMachine(graph)).toThrow(
      /choice "brave" on node "intro" targets unknown node "missing"/,
    );
  });

  it("throws at construction on duplicate node ids", () => {
    const graph = makeGraph();
    graph.nodes.push({ id: "intro", src: "duplicate.mp4" });
    expect(() => new BranchStateMachine(graph)).toThrow(
      /duplicate node id "intro"/,
    );
  });
});
