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

  it("throws at construction on duplicate choice ids within a node", () => {
    const graph = makeGraph();
    graph.nodes[0].choices!.push({ id: "brave", label: "Also open", target: "ending-safe" });
    expect(() => new BranchStateMachine(graph)).toThrow(
      /duplicate choice id "brave" on node "intro"/,
    );
  });

  it("allows the same choice id to repeat on different nodes", () => {
    const graph = makeGraph();
    graph.nodes[1].choices = [{ id: "brave", label: "Keep going", target: "ending-twist" }];
    expect(() => new BranchStateMachine(graph)).not.toThrow();
  });

  it("throws at construction on duplicate node ids", () => {
    const graph = makeGraph();
    graph.nodes.push({ id: "intro", src: "duplicate.mp4" });
    expect(() => new BranchStateMachine(graph)).toThrow(
      /duplicate node id "intro"/,
    );
  });

  it("looks up any node by id regardless of traversal position", () => {
    const machine = new BranchStateMachine(makeGraph());
    expect(machine.nodeById("ending-twist")?.src).toBe("ending-twist.mp4");
    expect(machine.nodeById("missing")).toBeUndefined();
  });

  it("lists every node in the graph via allNodes", () => {
    const machine = new BranchStateMachine(makeGraph());
    expect(machine.allNodes().map((n) => n.id)).toEqual([
      "intro",
      "hallway",
      "ending-safe",
      "ending-twist",
    ]);
  });

  it("reset returns to the start node and clears history", () => {
    const machine = new BranchStateMachine(makeGraph());
    machine.choose("brave");
    machine.choose("onward");
    machine.reset();
    expect(machine.current.id).toBe("intro");
    expect(machine.history).toEqual(["intro"]);
  });

  it("supports choosing again immediately after reset", () => {
    const machine = new BranchStateMachine(makeGraph());
    machine.choose("brave");
    machine.reset();
    const next = machine.choose("cautious");
    expect(next.id).toBe("ending-safe");
    expect(machine.history).toEqual(["intro", "ending-safe"]);
  });

  it("reset on a freshly-constructed machine is a no-op", () => {
    const machine = new BranchStateMachine(makeGraph());
    machine.reset();
    expect(machine.current.id).toBe("intro");
    expect(machine.history).toEqual(["intro"]);
  });

  // Simple deterministic LCG so property runs are reproducible across CI runs.
  function makeRng(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  function randomDag(rng: () => number, nodeCount: number): BranchGraph {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: `n${i}`,
      src: `n${i}.mp4`,
      choices: [] as { id: string; label: string; target: string }[],
    }));
    for (let i = 0; i < nodeCount - 1; i++) {
      const edgeCount = 1 + Math.floor(rng() * 2);
      for (let e = 0; e < edgeCount; e++) {
        const targetIndex = i + 1 + Math.floor(rng() * (nodeCount - i - 1));
        const choiceId = `c${i}-${targetIndex}-${e}`;
        if (nodes[i].choices.some((c) => c.target === `n${targetIndex}`)) continue;
        nodes[i].choices.push({ id: choiceId, label: choiceId, target: `n${targetIndex}` });
      }
    }
    return { start: "n0", nodes };
  }

  it("property: history always matches a real path through random walks", () => {
    const rng = makeRng(7);
    for (let trial = 0; trial < 50; trial++) {
      const graph = randomDag(rng, 3 + Math.floor(rng() * 10));
      const machine = new BranchStateMachine(graph);

      let steps = 0;
      while (!machine.isTerminal() && steps < 20) {
        const choices = machine.choices();
        const choice = choices[Math.floor(rng() * choices.length)];
        machine.choose(choice.id);
        steps += 1;

        expect(machine.history.length).toBe(steps + 1);
        expect(machine.history[machine.history.length - 1]).toBe(machine.current.id);
      }
    }
  });
});
