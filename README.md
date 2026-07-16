# Branchreel

A tiny, dependency-light JavaScript/TypeScript library for **branching interactive video**.
Drop in a video file and a state-machine JSON describing your story graph, and Branchreel
gives you click-to-branch playback — no proprietary video format, no hosted platform, no
backend required.

## Why

Interactive video today usually means adopting someone else's authoring platform and file
format, or standing up custom backend infrastructure just to track "what happened next."
Branchreel is the opposite bet: it's a small library you drop into a page you already
control. The story graph is plain JSON, the video is a plain `<video>` element, and the
branching logic runs entirely in the browser.

## What it does

- **State machine playback** — define nodes (video segments) and the choices that connect
  them; Branchreel drives an HTML `<video>` element through the graph.
- **Click-to-branch** — a choice prompt overlays the video at the right moment; picking one
  jump-cuts playback to the next segment with no reload and no buffering stutter.
- **Preload strategy** — upcoming branch targets are prefetched ahead of a decision point so
  the cut feels instant.
- **Non-linear scrubber** — a timeline control that understands branch structure instead of
  pretending the story is one continuous line.
- **Graph view** — a built-in visualization of the whole story shape, lighting up the path
  the viewer actually took.

## Install

```sh
npm install branchreel
```

## Usage

Describe your story as a `BranchGraph` — plain JSON, no authoring tool required — then hand a
`<video>` element and the graph to `PlayerController`:

```ts
import { PlayerController, type BranchGraph } from "branchreel";

const graph: BranchGraph = {
  start: "intro",
  nodes: [
    {
      id: "intro",
      src: "intro.mp4",
      end: 8, // seconds into intro.mp4 where playback pauses for a choice
      choices: [
        { id: "brave", label: "Open the door", target: "hallway" },
        { id: "cautious", label: "Turn back", target: "ending-safe" },
      ],
    },
    { id: "hallway", src: "hallway.mp4" }, // no `choices` => terminal node
    { id: "ending-safe", src: "ending-safe.mp4" },
  ],
};

const video = document.querySelector("video")!;
const player = new PlayerController(video, graph);

player.addEventListener("choice", (event) => {
  const { choices } = (event as CustomEvent).detail;
  // render `choices` as buttons; each calls player.choose(choice.id)
});

player.addEventListener("branch", (event) => {
  const { node, history } = (event as CustomEvent).detail;
  // jump-cut already happened — video.src is node.src; update your UI/graph view
});

player.addEventListener("end", (event) => {
  const { history } = (event as CustomEvent).detail;
  // reached a terminal node; history is the full path taken
});
```

`PlayerController` preloads every reachable choice target as soon as its node starts playing,
so `choose()` never stalls on a network request — if a preload fails, it silently falls back to
a normal load instead of throwing.

### Rendering the story graph

`computeGraphLayout` turns a `BranchGraph` into node positions and edges you can draw yourself
(SVG, canvas, whatever fits your app):

```ts
import { computeGraphLayout } from "branchreel";

const layout = computeGraphLayout(graph);
// layout.nodes: { id, x, y }[]
// layout.edges: { from, to, choiceId, label }[]
```

### Using the state machine directly

`PlayerController` is built on `BranchStateMachine`, which you can use standalone if you're
driving playback yourself (e.g. no `<video>` element, or a non-browser environment):

```ts
import { BranchStateMachine } from "branchreel";

const machine = new BranchStateMachine(graph);
machine.current; // the current BranchNode
machine.choose("brave"); // moves to "hallway", returns the new BranchNode
machine.history; // ["intro", "hallway"]
```

Construction validates the graph up front — a duplicate node id or a choice targeting an
unknown node throws immediately, rather than failing later on `choose()`.

## Graph JSON shape

| Field | Type | Notes |
|---|---|---|
| `start` | `string` | Id of the node playback begins at |
| `nodes` | `BranchNode[]` | Every node in the story |
| `node.id` | `string` | Unique within the graph |
| `node.src` | `string` | Video source URL for this segment |
| `node.start?` | `number` | Start offset in seconds (default 0) |
| `node.end?` | `number` | End offset in seconds; omit to play to the media's natural end |
| `node.choices?` | `BranchChoice[]` | Omit/empty for a terminal node |
| `choice.id` | `string` | Unique within the node's `choices` |
| `choice.label` | `string` | Text shown on the choice prompt |
| `choice.target` | `string` | Id of the node this choice leads to |

## Stack

- **TypeScript**, published as a small npm package with ESM + CJS builds and bundled types.
- **Vitest** for unit tests.
- A **Vite-powered playground** demo app (`packages/playground`) that consumes the library like
  any real integrator would, used both for local development and as the live public demo.

## Development

```sh
npm install
npm run build       # builds the library, then typechecks the playground against it
npm run test         # runs both packages' test suites
npm run --workspace=branchreel-playground dev   # live playground at localhost
```

## Status

The core state machine, playback controller, graph layout, and a full playground demo
("The Signal") are built and working end to end — see [`docs/BACKLOG.md`](docs/BACKLOG.md) for
what's shipped vs. still open, and [`docs/VISION.md`](docs/VISION.md) for the overall plan.

## License

MIT — see [`LICENSE`](LICENSE).
