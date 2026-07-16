# Branchreel — Backlog

Epics and stories for v1, per [`docs/VISION.md`](VISION.md) and [`docs/DESIGN.md`](DESIGN.md).
Every story lists concrete, verifiable acceptance criteria. The first story below is the wow
moment — it lands before anything else.

## Epic 1 — Core playback & the wow moment

- [ ] **Click-to-branch playback with a seamless jump-cut** *(the wow moment)*
  - Clicking a choice during playback switches the `<video>` to the target node within one
    animation frame, with no visible reload and no buffering stall beyond the preload window.
  - The graph view highlights the edge just traversed within 200ms of the click.
  - Playing two different choices from the same start produces two different
    `BranchStateMachine.history` arrays, each matching the path actually taken.

- [ ] **Choice prompt overlay timing**
  - The overlay appears automatically when playback reaches a node's `end` timecode (or the
    video's `ended` event if no `end` is set).
  - The overlay is absent during normal playback and clears immediately once a choice is made.
  - A terminal node (no `choices`) never shows an overlay.

- [ ] **Preload strategy for branch targets**
  - When a node with choices starts playing, every choice's target begins prefetching
    immediately, without blocking playback of the current node.
  - Choosing a preloaded target does not trigger a network request that blocks paint.
  - If a target fails to preload, choosing it still works via a normal-load fallback instead
    of throwing.

- [ ] **Design polish — player & overlay chrome**
  - The choice overlay, buttons, and player frame follow `docs/DESIGN.md` tokens (color, type,
    radius, motion) — no unstyled native buttons.
  - Choice buttons have themed hover / focus-visible / active states matching the juice plan
    (visible press feedback on click).

## Epic 2 — Non-linear scrubber & graph view

- [ ] **Scrubber reflects position within the current path**
  - The scrubber shows elapsed/total time for the current node's segment only, not the whole
    graph.
  - Dragging the scrubber seeks within the current node; it cannot scrub into a different
    branch.
  - The scrubber updates at least once per animation frame during playback, with no visible
    lag.

- [ ] **Graph view renders the full story shape**
  - Every node in the graph JSON renders as a labeled shape with edges to its choices'
    targets, including branches not yet taken.
  - A graph of at least 10 nodes / 15 edges lays out with no overlapping nodes.
  - The graph view is view-only in v1: clicking a node or edge does not change playback.

- [ ] **Path highlighting across a full playthrough**
  - Every node/edge on `BranchStateMachine.history` stays visually distinguished (amber) from
    unvisited ones (cyan/default) at all times, not only right after the choice is made.
  - Reloading the demo resets both playback and the highlighted path together — no stale
    highlight survives from a prior session.

- [ ] **Design polish — scrubber & graph view**
  - Both follow `docs/DESIGN.md` tokens and motion timings (trace-draw ~150ms, node pulse
    ~200ms).
  - Both are responsive per the layout intent at 390px and 1440px — the graph collapses to a
    tab on phone rather than being squeezed illegibly beside the video.

## Epic 3 — Sound, sample story, and public demo

- [ ] **Synth SFX via WebAudio**
  - Hover / choice / branch-lit / story-end sounds play using oscillators/noise only — no
    audio file assets in the repo.
  - A mute toggle silences all SFX and its state persists across a page reload via
    `localStorage`.
  - The `AudioContext` is created lazily on first user gesture — no autoplay-policy warning on
    load.

- [ ] **Sample multi-branch story ships with the playground**
  - The playground includes a real graph JSON with at least 3 branch points and 2+ distinct
    endings.
  - Demo video segments are either small bundled clips or clearly documented placeholders with
    a note on swapping in real media.
  - Playing the demo start-to-finish along any path reaches a terminal node with no console
    errors.

- [ ] **Public deploy readiness**
  - `npm run build` in `packages/playground` produces a self-contained `dist/` using only
    relative asset paths (no leading-slash `/` references in the built HTML/CSS/JS).
  - The built demo, served locally under a non-root path prefix (e.g. `/branchreel/`), loads
    and runs correctly.

- [ ] **Design polish — brand pass**
  - A favicon (inline SVG, accent-colored monogram) is present and referenced from the
    playground's `index.html`.
  - The wordmark signature detail (branch-and-rejoin trace, per `docs/DESIGN.md` §4) is
    implemented.

## Epic 4 — Library polish & docs

- [ ] **Public API documentation**
  - The README documents installation, the graph JSON shape, and a minimal usage example that
    matches the actual exported API.
  - Every exported type/class carries a doc comment that surfaces in the generated `.d.ts`.

- [ ] **Error handling for malformed graphs**
  - Constructing a `BranchStateMachine` with a choice that targets a nonexistent node throws a
    clear, specific error at construction time, not deferred to first `choose()`.
  - A graph with duplicate node ids is rejected with a clear error instead of silently
    overwriting one node with another.
