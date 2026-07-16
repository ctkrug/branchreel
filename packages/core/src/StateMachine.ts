import type { BranchChoice, BranchGraph, BranchNode } from "./types.js";

/**
 * Drives traversal of a {@link BranchGraph}. Holds no reference to a
 * `<video>` element or the DOM — playback wiring lives one layer up, so the
 * traversal logic is trivial to unit test and to reuse outside a browser.
 */
export class BranchStateMachine {
  private readonly nodesById: Map<string, BranchNode>;
  private currentId: string;
  private readonly path: string[];

  constructor(graph: BranchGraph) {
    if (graph.nodes.length === 0) {
      throw new Error("BranchStateMachine: graph has no nodes");
    }

    this.nodesById = new Map();
    for (const node of graph.nodes) {
      if (this.nodesById.has(node.id)) {
        throw new Error(
          `BranchStateMachine: duplicate node id "${node.id}"`,
        );
      }
      this.nodesById.set(node.id, node);
    }

    if (!this.nodesById.has(graph.start)) {
      throw new Error(
        `BranchStateMachine: start node "${graph.start}" is not in the graph`,
      );
    }

    for (const node of graph.nodes) {
      for (const choice of node.choices ?? []) {
        if (!this.nodesById.has(choice.target)) {
          throw new Error(
            `BranchStateMachine: choice "${choice.id}" on node "${node.id}" ` +
              `targets unknown node "${choice.target}"`,
          );
        }
      }
    }

    this.currentId = graph.start;
    this.path = [graph.start];
  }

  /** The node currently being played. */
  get current(): BranchNode {
    return this.nodesById.get(this.currentId)!;
  }

  /** Ids of every node visited so far, in order, including the current one. */
  get history(): readonly string[] {
    return this.path;
  }

  /** Choices available from the current node. Empty for a terminal node. */
  choices(): BranchChoice[] {
    return this.current.choices ?? [];
  }

  /** Whether the current node has no outgoing choices. */
  isTerminal(): boolean {
    return this.choices().length === 0;
  }

  /** Looks up any node in the graph by id, regardless of traversal state. */
  nodeById(id: string): BranchNode | undefined {
    return this.nodesById.get(id);
  }

  /** Every node in the graph, in the order given at construction. */
  allNodes(): BranchNode[] {
    return [...this.nodesById.values()];
  }

  /**
   * Follows the given choice and moves to its target node.
   * Throws if `choiceId` isn't offered by the current node.
   */
  choose(choiceId: string): BranchNode {
    const choice = this.choices().find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(
        `BranchStateMachine: no choice "${choiceId}" on node "${this.currentId}"`,
      );
    }

    // Construction-time validation guarantees every choice target exists.
    const target = this.nodesById.get(choice.target)!;

    this.currentId = target.id;
    this.path.push(target.id);
    return target;
  }
}
