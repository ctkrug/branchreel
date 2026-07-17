# Branchreel — Architecture

A map of the codebase for anyone (including a future session) picking this up cold. See
[`docs/VISION.md`](VISION.md) for why it exists and [`docs/DESIGN.md`](DESIGN.md) for the visual
direction.

## Layout

```
packages/
  core/                   the "branchreel" npm package — zero runtime dependencies
    src/
      types.ts            BranchGraph / BranchNode / BranchChoice — the JSON graph shape
      StateMachine.ts      BranchStateMachine — pure traversal logic, no DOM
      PlayerController.ts  drives a <video>-shaped host through the graph
      GraphLayout.ts       computeGraphLayout — pure BFS layout for the graph view
      index.ts             public exports
    test/                  vitest, one file per module above
  playground/             "branchreel-playground" — the live demo app (Vite)
    src/
      story.ts             the sample story ("The Signal") + its placeholder video imports
      media/                ffmpeg-generated placeholder clips + regeneration instructions
      main.ts               DOM wiring: player, overlays, scrubber, mute toggle
      graph-view.ts          SVG rendering of computeGraphLayout + path highlighting
      audio.ts               SoundEngine — synthesized WebAudio SFX + persisted mute state
      format.ts               pure scrubber/time-formatting helpers (tested)
      style.css                docs/DESIGN.md tokens + layout, implemented
    index.html               page shell
```

## Data flow

1. **`BranchGraph`** (plain JSON: `{ start, nodes: [{ id, src, start?, end?, choices? }] }`) is
   the single source of truth for a story. It never changes at runtime.
2. **`BranchStateMachine`** wraps a graph and tracks `current` node + `history`. It validates
   the graph at construction (duplicate ids, dangling choice targets) so a bad graph fails fast
   instead of surfacing a confusing error mid-playback. It has no DOM/video dependency — fully
   unit-testable in Node.
3. **`PlayerController`** wraps a `BranchStateMachine` plus a `VideoHost` (an interface
   `HTMLVideoElement` satisfies directly; tests use a fake `EventTarget`). It:
   - loads the current node's `src`/`start` onto the host,
   - preloads every choice target via a hidden host as soon as a node starts playing,
   - listens for `timeupdate`/`ended` to detect the node's end, pausing and emitting a `choice`
     event (or `end` if terminal),
   - on `choose(id)`, jump-cuts the host to the target's `src` synchronously (no `await` between
     click and new frame) and emits a `branch` event.
   This is the "wow moment" and the most heavily tested module (`PlayerController.test.ts` uses
   a `FakeVideoHost` to drive the same event sequence a real `<video>` would, without jsdom).
4. **`computeGraphLayout`** takes a `BranchGraph` and returns node positions (BFS-depth columns)
   and edges — pure, no rendering. `GraphView` (playground) turns that into an SVG and calls
   `highlightPath(history)` on every `branch` event to keep the traversed path amber.
5. **`main.ts`** is the only place these are wired together for the demo: it owns a single
   `PlayerController` instance for the page's lifetime (restarted in place via `reset()`, not
   recreated), drives the scrubber off a `requestAnimationFrame` loop against the current
   segment's bounds, and forwards `choice`/`branch`/`end` events to the overlays, `GraphView`,
   and `SoundEngine`.

## Why VideoHost instead of HTMLVideoElement directly

`PlayerController`'s branch-switching and timing logic is the core value of the library and the
part most worth testing thoroughly. Depending on a narrow `VideoHost` interface (src,
currentTime, play/pause/load, EventTarget) instead of `HTMLVideoElement` means the full event
sequence — node loads, preload, timeupdate-triggers-choice, jump-cut, dispose — is unit-tested
in plain Node against a fake host, with no jsdom/browser media stack needed in CI.

## Running it

```sh
npm install
npm run build                                    # builds core, typechecks playground against it
npm run test                                      # vitest for both packages
npm run --workspace=branchreel-playground dev      # live playground
npm run --workspace=branchreel-playground build    # static dist/, relative asset paths
```

The playground build is base-path-relative (`base: "./"` in `vite.config.ts`) so `dist/` can be
served from any subpath.
