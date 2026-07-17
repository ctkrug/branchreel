# Branchreel — Design Direction

This is the art-direction brief for the **playground demo** (`packages/playground`) and its
eventual public landing page (`site/`). Both share this direction — the demo and the marketing
page are one brand. The library itself (`packages/core`) ships no UI; this document governs
everything a viewer actually sees.

## 1. Aesthetic direction

**Branchreel is blueprint/technical:** a dark schematic canvas where the story graph looks like
an engineering diagram — thin cyan trace-lines connecting nodes, amber highlighting the path
you actually lit up by choosing it. The audience is developers evaluating a library; the UI
should read as precise and instrumented, not decorative. This also isn't arbitrary skinning —
the graph view *is* a node-and-edge diagram, so a blueprint aesthetic is the literal subject
matter, not a theme bolted onto unrelated content.

This direction (dark schematic/technical) is distinct from a generic "dark gray cards" default:
it commits to grid lines, monospace annotations, and circuit-style connective lines as the
actual visual language, not just a dark background with rounded cards on top.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b1220` | Page background — deep navy-black, not pure black |
| `--surface-1` | `#121c2e` | Card/panel background |
| `--surface-2` | `#1a2740` | Raised surface (active panel, overlay) |
| `--text` | `#e8edf5` | Primary text |
| `--text-muted` | `#8a99b3` | Secondary text, captions, node ids |
| `--accent` | `#4fd1ff` | Cyan — default trace lines, links, focus rings |
| `--accent-support` | `#ffb454` | Amber — the path taken / active choice / hover-lit trace |
| `--success` | `#4ade80` | Confirmation states |
| `--danger` | `#f87171` | Error states (e.g. invalid graph JSON) |

**Type pairing:** `JetBrains Mono` (display — wordmark, headings, node ids, timecodes; it's a
technical typeface for a technical UI) + `Inter` (UI/body text, choice labels, longform copy).
Both from Google Fonts, with `ui-monospace, monospace` / `system-ui, sans-serif` fallbacks.

**Spacing:** 8px base unit (8/16/24/32/48/64).

**Corner radius:** 4px — small and precise, not soft/rounded. Consistent with a schematic, not
a toy.

**Shadow/glow:** active nodes and the currently-lit graph path get a soft cyan or amber outer
glow (`box-shadow: 0 0 12px rgba(79, 209, 255, 0.35)`); inactive surfaces get a subtle dark
layered shadow (`0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)`) for depth, never flat.

**Motion:** UI transitions 160ms ease-out. The branch jump-cut itself must feel instant — under
120ms perceived latency from click to new frame. Graph-view path lighting animates as a
150ms trace-draw, not an instant snap.

## 3. Layout intent

**The hero is the video player + choice overlay.** On desktop (1440×900) it occupies the
left/majority ~65% of the viewport at full height; the graph view sits alongside on the right
as a persistent 380px panel (not a modal), so the viewer can see the story shape update live as
they choose. The panel is sized so the diagram draws at close to 1:1 — squeeze it narrower and
the whole graph scales down until the node ids stop being readable.

On phone (390×844) the video stacks on top at full width and the graph view sits below it, open
by default and collapsible via a tab. **The video keeps its native 16:9 rather than filling
~60vh:** at 390px wide that is only ~200px tall, and stretching the frame to 60vh would crop a
16:9 segment down to a portrait box, cutting the sides off the picture. The graph view takes the
height the video doesn't need (~45vh), so the column still fills the screen instead of trailing
off into empty background, and the choice overlay stays full-width and thumb-reachable.

The overlays live inside the video frame, so at phone sizes they have ~200px to work with: their
type and spacing step down to fit rather than overflowing the frame and clipping their own
buttons.

No dead space: the background carries a faint grid/graph-paper texture (see signature detail)
so empty regions still read as "designed," not blank.

## 4. Signature detail

The **wordmark** renders as `branch` in cyan with a small circuit-trace glyph splitting off the
"h" into a thin line that reconnects into `reel` in amber — a literal branch-and-rejoin, drawn
once in SVG and lightly animated (the trace draws itself in on page load, ~400ms, then rests).
This is the one flourish; everything else stays restrained and functional.

## 5. Juice plan (playground interaction feedback)

Branchreel isn't a game, but the choice-and-branch moment is the whole product and must feel
tactile:

- **Choice press feedback:** the chosen option depresses (translateY 1px + darken) on
  click/tap, 100ms, before the cut.
- **Branch-cut feedback:** the graph view's newly-traveled edge lights up amber with a
  150ms trace-draw animation the instant the choice resolves — the visual confirmation that a
  choice registered, independent of video load time.
- **Node-arrival pulse:** the graph node you just landed on gets a brief (200ms) glow pulse.
- **Synth SFX (WebAudio, generated in code, zero binary assets):**
  - *hover* — a very quiet 30ms sine blip (660Hz) on choice-button hover.
  - *choice* — a brighter 60ms triangle tick (880Hz) on click.
  - *branch-lit* — a soft 150ms sweep (440Hz → 880Hz) that runs with the graph trace-draw, so
    the two land together.
  - *story-end* — a small resolving triad (440/554/660Hz, 400ms) when a terminal node is
    reached.
  - All SFX gain-staged quiet (peak ≈ -18dB) and rate-throttled so a single sound cannot
    retrigger itself within 60ms. The throttle is **per sound**: committing a choice fires
    *choice* and *branch-lit* in the same tick by design, and both are meant to be heard.
  - A mute toggle (speaker icon, top-right of the player) persists to `localStorage` and the
    `AudioContext` is created lazily on first user gesture per browser autoplay policy.
- Respect `prefers-reduced-motion`: keep the trace-draw and pulses functional but drop any
  screen-shake-style effects (none are currently planned beyond the above, so this mainly
  governs future additions).
