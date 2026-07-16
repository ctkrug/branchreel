import { describe, expect, it } from "vitest";
import { computeGraphLayout } from "../src/GraphLayout.js";
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

describe("computeGraphLayout", () => {
  it("places the start node at column 0", () => {
    const layout = computeGraphLayout(makeGraph());
    const start = layout.nodes.find((n) => n.id === "intro")!;
    expect(start.x).toBe(110);
  });

  it("places each node's column at its BFS distance from start", () => {
    const layout = computeGraphLayout(makeGraph());
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
    expect(byId["hallway"].x).toBeGreaterThan(byId["intro"].x);
    expect(byId["ending-safe"].x).toBe(byId["hallway"].x);
    expect(byId["ending-twist"].x).toBeGreaterThan(byId["hallway"].x);
  });

  it("stacks same-column nodes at distinct rows with no overlap", () => {
    const layout = computeGraphLayout(makeGraph());
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
    expect(byId["hallway"].y).not.toBe(byId["ending-safe"].y);
  });

  it("produces one edge per choice, labeled from the graph", () => {
    const layout = computeGraphLayout(makeGraph());
    expect(layout.edges).toHaveLength(3);
    expect(layout.edges).toContainEqual({
      from: "intro",
      to: "hallway",
      choiceId: "brave",
      label: "Open the door",
    });
  });

  it("produces no overlapping node positions for a wider graph", () => {
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      src: `n${i}.mp4`,
      choices: i < 11 ? [{ id: "next", label: "Next", target: `n${i + 1}` }] : undefined,
    }));
    // Add a few extra branches so some columns have multiple rows.
    nodes[0].choices!.push({ id: "skip", label: "Skip ahead", target: "n5" });
    nodes[2].choices!.push({ id: "detour", label: "Detour", target: "n8" });

    const layout = computeGraphLayout({ start: "n0", nodes });
    const seen = new Set<string>();
    for (const node of layout.nodes) {
      const key = `${node.x},${node.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("still positions a node unreachable from start", () => {
    const graph = makeGraph();
    graph.nodes.push({ id: "orphan", src: "orphan.mp4" });
    const layout = computeGraphLayout(graph);
    expect(layout.nodes.find((n) => n.id === "orphan")).toBeDefined();
  });

  it("handles an empty node list without throwing", () => {
    const layout = computeGraphLayout({ start: "x", nodes: [] });
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.width).toBe(0);
    expect(layout.height).toBe(0);
  });

  it("does not re-position a node reached again via a back edge", () => {
    const graph: BranchGraph = {
      start: "a",
      nodes: [
        { id: "a", src: "a.mp4", choices: [{ id: "go", label: "Go", target: "b" }] },
        { id: "b", src: "b.mp4", choices: [{ id: "back", label: "Back", target: "a" }] },
      ],
    };
    const layout = computeGraphLayout(graph);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(2);
  });
});
