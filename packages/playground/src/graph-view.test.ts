// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchGraph } from "branchreel";
import { GraphView } from "./graph-view.js";

const graph: BranchGraph = {
  start: "intro",
  nodes: [
    {
      id: "intro",
      src: "intro.mp4",
      choices: [
        { id: "a", label: "Go left", target: "left" },
        { id: "b", label: "Go right", target: "right" },
      ],
    },
    { id: "left", src: "left.mp4" },
    { id: "right", src: "right.mp4" },
  ],
};

function makeSvg(): SVGSVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

/** Top-left corner of a node group, read back off its `transform`. */
function nodeAt(svg: SVGSVGElement, id: string): { x: number; y: number } {
  const group = Array.from(svg.querySelectorAll(".graph-view__node")).find(
    (el) => el.querySelector(".graph-view__node-label")?.textContent === id,
  );
  const transform = group?.getAttribute("transform") ?? "";
  const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(transform);
  if (!match) throw new Error(`no positioned node "${id}"`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

describe("GraphView", () => {
  beforeEach(() => {
    // jsdom implements neither matchMedia nor SVGPathElement.getTotalLength;
    // reduced-motion=true keeps highlightPath from touching either.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }) as unknown as typeof matchMedia,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders one node group per graph node", () => {
    const view = new GraphView(makeSvg(), graph);
    const svg = (view as unknown as { svg: SVGSVGElement }).svg;
    expect(svg.querySelectorAll(".graph-view__node")).toHaveLength(3);
  });

  it("renders one edge per choice", () => {
    const view = new GraphView(makeSvg(), graph);
    const svg = (view as unknown as { svg: SVGSVGElement }).svg;
    expect(svg.querySelectorAll(".graph-view__edge")).toHaveLength(2);
  });

  // The graph panel is portrait (a tall column beside the video, and a
  // collapsible drawer on phone), so the diagram flows depth downward
  // rather than across; a left-to-right diagram scales down to fit the
  // panel's width and leaves the labels unreadable.
  it("flows depth down the panel and spreads siblings across it", () => {
    const svg = makeSvg();
    new GraphView(svg, graph);
    const intro = nodeAt(svg, "intro");
    const left = nodeAt(svg, "left");
    const right = nodeAt(svg, "right");

    expect(left.y).toBeGreaterThan(intro.y);
    expect(right.y).toBeGreaterThan(intro.y);
    expect(left.y).toBe(right.y);
    expect(left.x).not.toBe(right.x);
  });

  it("marks nodes with no choices as terminal", () => {
    const view = new GraphView(makeSvg(), graph);
    const svg = (view as unknown as { svg: SVGSVGElement }).svg;
    const terminalIds = Array.from(svg.querySelectorAll(".graph-view__node--terminal")).map(
      (el) => el.querySelector(".graph-view__node-label")?.textContent,
    );
    expect(terminalIds.sort()).toEqual(["left", "right"]);
  });

  it("marks only visited nodes as is-visited", () => {
    const svg = makeSvg();
    const view = new GraphView(svg, graph);
    view.highlightPath(["intro", "left"]);

    const visited = Array.from(svg.querySelectorAll(".graph-view__node.is-visited")).map(
      (el) => el.querySelector(".graph-view__node-label")?.textContent,
    );
    expect(visited).toEqual(["intro", "left"]);
  });

  it("marks only the traversed edge as active", () => {
    const svg = makeSvg();
    const view = new GraphView(svg, graph);
    view.highlightPath(["intro", "left"]);

    const activeEdges = svg.querySelectorAll(".graph-view__edge.is-active");
    expect(activeEdges).toHaveLength(1);
    expect(activeEdges[0].getAttribute("marker-end")).toBe(
      "url(#branchreel-arrow-active)",
    );
  });

  it("clears stale highlighting when history shrinks (e.g. after reset)", () => {
    const svg = makeSvg();
    const view = new GraphView(svg, graph);
    view.highlightPath(["intro", "left"]);
    view.highlightPath(["intro"]);

    expect(svg.querySelectorAll(".graph-view__node.is-visited")).toHaveLength(1);
    expect(svg.querySelectorAll(".graph-view__edge.is-active")).toHaveLength(0);
  });

  it("animates the trace-draw when motion is not reduced", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia,
    );
    // jsdom models every SVG element as the generic SVGElement (no
    // SVGPathElement subclass) and implements neither geometry method.
    (window.SVGElement.prototype as unknown as { getTotalLength(): number }).getTotalLength =
      () => 42;
    window.SVGElement.prototype.getBoundingClientRect ??= () =>
      ({}) as unknown as DOMRect;

    const svg = makeSvg();
    const view = new GraphView(svg, graph);
    view.highlightPath(["intro", "left"]);

    const activeEdge = svg.querySelector(".graph-view__edge.is-active") as SVGPathElement;
    expect(activeEdge.style.strokeDashoffset).toBe("0");
    expect(activeEdge.style.transition).toContain("stroke-dashoffset");
  });

  it("handles an empty history without throwing", () => {
    const svg = makeSvg();
    const view = new GraphView(svg, graph);
    expect(() => view.highlightPath([])).not.toThrow();
    expect(svg.querySelectorAll(".graph-view__node.is-visited")).toHaveLength(0);
  });

  it("re-render on construction clears any previous content from the svg", () => {
    const svg = makeSvg();
    const stale = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    stale.setAttribute("id", "stale-marker");
    svg.appendChild(stale);
    new GraphView(svg, graph);
    expect(svg.querySelector("#stale-marker")).toBeNull();
  });
});
