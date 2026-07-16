import { computeGraphLayout } from "branchreel";
import type { BranchGraph, GraphLayoutNode } from "branchreel";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const PADDING = 24;

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
      columnSpacing: NODE_WIDTH + 70,
      rowSpacing: NODE_HEIGHT + 32,
    });
    const viewWidth = layout.width + PADDING * 2;
    const viewHeight = Math.max(layout.height, NODE_HEIGHT) + PADDING * 2;
    this.svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
    this.svg.innerHTML = "";
    this.svg.appendChild(this.buildDefs());

    const positionOf = new Map(layout.nodes.map((n) => [n.id, n]));

    const edgeLayer = document.createElementNS(SVG_NS, "g");
    edgeLayer.setAttribute("class", "graph-view__edges");
    for (const edge of layout.edges) {
      const from = positionOf.get(edge.from);
      const to = positionOf.get(edge.to);
      if (!from || !to) continue;
      const path = this.drawEdge(from, to);
      edgeLayer.appendChild(path);
      this.edgeEls.set(`${edge.from}→${edge.to}`, path);
    }
    this.svg.appendChild(edgeLayer);

    const nodeLayer = document.createElementNS(SVG_NS, "g");
    nodeLayer.setAttribute("class", "graph-view__nodes");
    for (const node of layout.nodes) {
      const el = this.drawNode(node);
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

  private drawEdge(from: GraphLayoutNode, to: GraphLayoutNode): SVGPathElement {
    const x1 = from.x + NODE_WIDTH / 2 + PADDING;
    const y1 = from.y + PADDING;
    const x2 = to.x - NODE_WIDTH / 2 + PADDING;
    const y2 = to.y + PADDING;
    const midX = (x1 + x2) / 2;

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
    path.setAttribute("class", "graph-view__edge");
    path.setAttribute("marker-end", "url(#branchreel-arrow)");
    path.setAttribute("fill", "none");
    return path;
  }

  private drawNode(node: GraphLayoutNode): SVGGElement {
    const isTerminal = this.terminalIds.has(node.id);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute(
      "class",
      `graph-view__node${isTerminal ? " graph-view__node--terminal" : ""}`,
    );
    g.setAttribute(
      "transform",
      `translate(${node.x - NODE_WIDTH / 2 + PADDING}, ${node.y - NODE_HEIGHT / 2 + PADDING})`,
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
    text.textContent = node.id;
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
