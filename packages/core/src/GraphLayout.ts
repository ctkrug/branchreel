import type { BranchGraph } from "./types.js";

/** A node's computed position in the graph view, in px. */
export interface GraphLayoutNode {
  id: string;
  x: number;
  y: number;
}

/** A drawable edge for one choice, from its source node to its target. */
export interface GraphLayoutEdge {
  from: string;
  to: string;
  choiceId: string;
  label: string;
}

/** The full computed layout: every node's position, every edge, and the overall canvas size. */
export interface GraphLayout {
  nodes: GraphLayoutNode[];
  edges: GraphLayoutEdge[];
  /** Total width needed to draw every column, in px. */
  width: number;
  /** Total height needed to draw the tallest column, in px. */
  height: number;
}

export interface GraphLayoutOptions {
  /** Horizontal distance between columns (BFS depth from start), in px. */
  columnSpacing?: number;
  /** Vertical distance between rows within a column, in px. */
  rowSpacing?: number;
}

/**
 * Lays out a {@link BranchGraph} for the graph view: each node's column is
 * its shortest-path distance from `start` (BFS depth), and nodes within a
 * column stack vertically in discovery order. This keeps a DAG-shaped
 * story free of overlaps without a general graph-layout dependency; a
 * choice that points back to an earlier column still draws as an edge
 * but does not move that node.
 */
export function computeGraphLayout(
  graph: BranchGraph,
  options: GraphLayoutOptions = {},
): GraphLayout {
  const columnSpacing = options.columnSpacing ?? 220;
  const rowSpacing = options.rowSpacing ?? 96;

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const columnOf = new Map<string, number>();
  const columns: string[][] = [];

  const startId = nodesById.has(graph.start) ? graph.start : graph.nodes[0]?.id;
  if (startId !== undefined) {
    columnOf.set(startId, 0);
    columns[0] = [startId];
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const column = columnOf.get(id)!;
      for (const choice of nodesById.get(id)?.choices ?? []) {
        if (columnOf.has(choice.target)) continue;
        const nextColumn = column + 1;
        columnOf.set(choice.target, nextColumn);
        (columns[nextColumn] ??= []).push(choice.target);
        queue.push(choice.target);
      }
    }
  }

  // Nodes unreachable from `start` still get a (trailing) position rather
  // than being silently dropped from the view.
  for (const node of graph.nodes) {
    if (!columnOf.has(node.id)) {
      columnOf.set(node.id, columns.length);
      columns.push([node.id]);
    }
  }

  const nodes: GraphLayoutNode[] = columns.flatMap((ids, column) =>
    ids.map((id, row) => ({
      id,
      x: column * columnSpacing + columnSpacing / 2,
      y: row * rowSpacing + rowSpacing / 2,
    })),
  );

  const edges: GraphLayoutEdge[] = graph.nodes.flatMap((node) =>
    (node.choices ?? []).map((choice) => ({
      from: node.id,
      to: choice.target,
      choiceId: choice.id,
      label: choice.label,
    })),
  );

  const width = columns.length * columnSpacing;
  const tallestColumn = columns.reduce((max, ids) => Math.max(max, ids.length), 0);
  const height = tallestColumn * rowSpacing;

  return { nodes, edges, width, height };
}
