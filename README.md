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

## Stack

- **TypeScript**, published as a small npm package with ESM + CJS builds and bundled types.
- **Vitest** for unit tests.
- A **Vite-powered playground** demo app that consumes the library like any real integrator
  would, used both for local development and as the live public demo.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the plan and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's being built next.

## License

MIT — see [`LICENSE`](LICENSE).
