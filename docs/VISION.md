# Branchreel — Vision

## The problem

Interactive video ("choose what happens next" storytelling) almost always means one of two
bad trades today:

1. **Adopt a hosted platform** — your story lives in someone else's proprietary editor and
   file format, behind their player, often behind their paywall.
2. **Build it yourself from scratch** — hand-roll video switching, choice UI, preloading, and
   scrubbing on every project because there's no small, focused library that just does this.

There's no equivalent of "drop in a chart library" for branching video. Teams either buy a
platform or reinvent the wheel.

## Who it's for

Developers building interactive stories, training/onboarding videos, choose-your-own-adventure
content, or marketing experiences who already have (or can produce) a set of video segments and
want branching playback **on a page they control** — no new backend, no vendor lock-in, no new
file format to learn.

## The core idea

A story is a **state machine**: nodes are video segments, edges are choices. Branchreel is two
things layered on that idea:

1. A small, framework-agnostic **core library** (`branchreel` on npm) that owns the state
   machine, drives an HTML `<video>` element through it, preloads upcoming branches, and
   exposes a scrubber and graph-view model that understand non-linear time.
2. A **playground demo app** that consumes the library exactly as a real integrator would,
   doubling as living documentation and the public-facing showcase.

The JSON graph format is intentionally plain — an array of nodes, each with a video `src` and
a list of `{ label, target }` choices. No new authoring tool required to hand-write one.

## Key design decisions

- **No proprietary format.** The graph is plain JSON; the media is a plain video file. Anyone
  can hand-author a graph or generate one from another tool.
- **No backend.** All state (current node, history/path taken) lives in memory in the browser.
  Persistence, if a consumer wants it, is their concern, not the library's.
- **One `<video>` element, not many.** Branch changes swap the *source* and seek within it
  rather than juggling multiple video elements, so the "jump cut" reads as one continuous
  player, not a crossfade between two.
- **Preloading is a first-class concern, not an afterthought.** Every node's choices point at
  known targets ahead of time, so the library can start fetching the next segment as soon as
  the current one starts playing — the click-to-branch moment must never stall on a network
  request.
- **The scrubber and graph view are honest about structure.** A branching story isn't one
  timeline; the scrubber shows progress through the *current* path, and the graph view is the
  one place that shows the whole shape, including branches not taken.
- **Small dependency footprint.** The core library ships with zero runtime dependencies beyond
  the browser platform itself (`<video>`, Canvas/SVG for the graph view).

## What "v1 done" looks like

- `npm install branchreel` gives a consumer a `BranchStateMachine` plus a player controller that
  can drive a real `<video>` element through a JSON graph, with choice-prompt overlays appearing
  at the right moment and branch transitions that don't stall on load.
- The preload strategy measurably eliminates buffering stutter on a branch transition for
  reasonably-sized segments on a typical connection.
- A non-linear scrubber accurately reflects position within the current path.
- A graph view renders the full story shape and highlights the path taken so far.
- The playground demo plays a short multi-branch story end to end, is publicly hosted, and
  demonstrates every one of the above without needing to read the library source to understand
  what happened.
- The library, its types, and its public API are documented well enough that a new consumer can
  integrate it from the README alone.
