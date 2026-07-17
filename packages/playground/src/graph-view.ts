import { computeGraphLayout } from "branchreel";
import type { BranchGraph, GraphLayoutNode } from "branchreel";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 104;
const NODE_HEIGHT = 34;
const PADDING = 14;
/** Distance between depth levels, running down the panel. */
const DEPTH_SPACING = NODE_HEIGHT + 84;
/** Distance between siblings at the same depth, running across it. */
const SIBLING_SPACING = NODE_WIDTH + 12;

/** A node's drawing position, in viewBox units. */
interface Point {
  x: number;
  y: number;
}

/** Swaps a layout node's axes so depth reads downward, and insets it by the padding. */
function transpose(node: GraphLayoutNode): Point {
  return { x: node.y + PADDING, y: node.x + PADDING };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Renders a {@link BranchGraph} as a schematic node/edge diagram (the
 * literal subject of the blueprint direction) and keeps the traversed
 * path highlighted in amber as the viewer's history grows. View-only:
 * nodes/edges are not interactive in v1.
 */
export class GraphView {
  private readonly svg: SVGSVGElement;
  private readonly terminalIds: Set<string>;
  private readonly nodeEls = new Map<string, SVGGElement>();
  private readonly edgeEls = new Map<string, SVGPathElement>();

  constructor(svg: SVGSVGElement, graph: BranchGraph) {
    this.svg = svg;
    this.terminalIds = new Set(
      graph.nodes.filter((n) => !n.choices || n.choices.length === 0).map((n) => n.id),
    );
    this.render(graph);
  }

  /** Marks every node/edge on `history` as visited/traversed; clears the rest. */
  highlightPath(history: readonly string[]): void {
    for (const [id, el] of this.nodeEls) {
      el.classList.toggle("is-visited", history.includes(id));
    }

    const traversed = new Set<string>();
    for (let i = 0; i < history.length - 1; i++) {
      traversed.add(`${history[i]}→${history[i + 1]}`);
    }

    for (const [key, el] of this.edgeEls) {
      const active = traversed.has(key);
      const wasActive = el.classList.contains("is-active");
      el.classList.toggle("is-active", active);
      el.setAttribute(
        "marker-end",
        active ? "url(#branchreel-arrow-active)" : "url(#branchreel-arrow)",
      );
      if (active && !wasActive) this.animateTraceDraw(el);
    }
  }

  private render(graph: BranchGraph): void {
    const layout = computeGraphLayout(graph, {
      columnSpacing: DEPTH_SPACING,
      rowSpacing: SIBLING_SPACING,
    });
    // computeGraphLayout runs depth along x and siblings along y. The panel
    // is portrait, so the diagram is transposed to flow depth downward and
    // its extents swap with it.
    const viewWidth = Math.max(layout.height, SIBLING_SPACING) + PADDING * 2;
    const viewHeight = Math.max(layout.width, DEPTH_SPACING) + PADDING * 2;
    this.svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
    this.svg.innerHTML = "";
    this.svg.appendChild(this.buildDefs());

    const centerOf = new Map(layout.nodes.map((n) => [n.id, transpose(n)]));

    const edgeLayer = document.createElementNS(SVG_NS, "g");
    edgeLayer.setAttribute("class", "graph-view__edges");
    for (const edge of layout.edges) {
      const from = centerOf.get(edge.from);
      const to = centerOf.get(edge.to);
      if (!from || !to) continue;
      const path = this.drawEdge(from, to);
      edgeLayer.appendChild(path);
      this.edgeEls.set(`${edge.from}→${edge.to}`, path);
    }
    this.svg.appendChild(edgeLayer);

    const nodeLayer = document.createElementNS(SVG_NS, "g");
    nodeLayer.setAttribute("class", "graph-view__nodes");
    for (const node of layout.nodes) {
      const el = this.drawNode(node.id, centerOf.get(node.id)!);
      nodeLayer.appendChild(el);
      this.nodeEls.set(node.id, el);
    }
    this.svg.appendChild(nodeLayer);
  }

  private buildDefs(): SVGDefsElement {
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML = `
      <marker id="branchreel-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8 Z" class="graph-view__arrowhead" />
      </marker>
      <marker id="branchreel-arrow-active" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8 Z" class="graph-view__arrowhead graph-view__arrowhead--active" />
      </marker>
    `;
    return defs as unknown as SVGDefsElement;
  }

  /** Draws a choice as a vertical S-curve from the source's foot to the target's head. */
  private drawEdge(from: Point, to: Point): SVGPathElement {
    const y1 = from.y + NODE_HEIGHT / 2;
    const y2 = to.y - NODE_HEIGHT / 2;
    const midY = (y1 + y2) / 2;

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M ${from.x} ${y1} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${y2}`);
    path.setAttribute("class", "graph-view__edge");
    path.setAttribute("marker-end", "url(#branchreel-arrow)");
    path.setAttribute("fill", "none");
    return path;
  }

  private drawNode(id: string, center: Point): SVGGElement {
    const isTerminal = this.terminalIds.has(id);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute(
      "class",
      `graph-view__node${isTerminal ? " graph-view__node--terminal" : ""}`,
    );
    g.setAttribute(
      "transform",
      `translate(${center.x - NODE_WIDTH / 2}, ${center.y - NODE_HEIGHT / 2})`,
    );

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("width", String(NODE_WIDTH));
    rect.setAttribute("height", String(NODE_HEIGHT));
    rect.setAttribute("rx", "4");
    rect.setAttribute("class", "graph-view__node-rect");
    g.appendChild(rect);

    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(NODE_WIDTH / 2));
    text.setAttribute("y", String(NODE_HEIGHT / 2 + 4));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "graph-view__node-label");
    text.textContent = id;
    g.appendChild(text);

    return g;
  }

  private animateTraceDraw(path: SVGPathElement): void {
    if (prefersReducedMotion()) return;
    const length = path.getTotalLength();
    path.style.transition = "none";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Force a reflow so the browser registers the reset before animating.
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 150ms ease-out";
    path.style.strokeDashoffset = "0";
  }
}
