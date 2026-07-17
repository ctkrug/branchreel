# Building Branchreel: branching video without a platform

I wanted a "choose what happens next" video on a page I control. Every route I looked at asked
for something I did not want to give up. The hosted platforms want the story in their editor,
their file format, and their player. The DIY route means writing source swapping, preloading,
choice overlays, and a scrubber that understands branches, and then writing all of it again on
the next project.

So I wrote the small thing that was missing. [Branchreel](https://github.com/ctkrug/branchreel)
is a library: you give it a JSON graph and a `<video>` element, and viewers click to branch.
There is no backend and no new file format. A story is just a state machine where nodes are
video segments and choices are the edges between them.

```json
{
  "start": "intro",
  "nodes": [
    { "id": "intro", "src": "intro.mp4", "end": 8, "choices": [
      { "id": "brave", "label": "Open the door", "target": "hallway" }
    ]},
    { "id": "hallway", "src": "hallway.mp4" }
  ]
}
```

Two decisions ended up shaping the whole thing.

## The library never sees a `<video>` element

The interesting logic is the branch switching and the timing around it, and that is exactly the
logic that is miserable to test if it depends on `HTMLVideoElement`. You need a DOM, then a
browser media stack, and then you are waiting on real playback in CI to assert that a choice
prompt appeared at the right second.

So `PlayerController` does not take a video element. It takes a `VideoHost`:

```ts
export interface VideoHost extends EventTarget {
  src: string;
  currentTime: number;
  play(): void | Promise<void>;
  pause(): void;
  load?(): void;
}
```

A real `<video>` satisfies that on its own, with no adapter. Tests pass a fake `EventTarget`
with a `currentTime` they set by hand, then dispatch `timeupdate` and assert on what came out.
The full sequence, node loads, preload starts, timeupdate crosses the end timecode, choice event
fires, jump-cut swaps the src, is covered in plain Node with no jsdom and no media stack. Naming
the four properties I actually needed, instead of depending on the 80-member interface they came
from, is the highest-leverage thing in the codebase.

## The cut has to be synchronous

The branch moment is the entire product. If clicking a choice produces a spinner, none of the
rest matters. Two things keep it instant.

Every choice from a node points at a known target, so the moment a node starts playing, all of
its targets start loading in hidden hosts. By the time the viewer decides, the next segment is
usually cached.

And `choose()` never awaits anything. It sets `host.src` and `host.currentTime` straight away and
dispatches the event afterward. There is no `await` between the click and the new frame. When
`play()` returns a promise that rejects because of an autoplay policy, that gets swallowed on
purpose: it is expected, and it is not worth an unhandled rejection.

## The bug I shipped and then caught

Late on, I added a rate-throttle to the synthesized sound effects so mouse jitter could not stack
overlapping oscillators. Sensible. I keyed it off one shared timestamp: no sound within 60ms of
the last one.

That silenced the most important sound in the app. Committing a choice calls `sound.choice()` and
then `controller.choose()`, which dispatches its `branch` event synchronously, which calls
`sound.branchLit()`. Same millisecond. The branch sweep never played once. The test I had written
even encoded the bug as correct, because it fired `hover()` and then `choice()` and asserted that
only one oscillator existed.

The fix was to key the throttle per sound instead of globally. The lesson is older than the bug:
"do not retrigger" and "do not overlap different sounds" are not the same rule, and a test that
asserts the behaviour you happened to write is not the same as a test that asserts the behaviour
you wanted.

## What I would do differently

The graph layout puts each node in a column by its distance from the start and stacks siblings in
discovery order. It is 40 lines and never overlaps, but it does not centre parents over their
children, so wide stories drift left. A real tree layout is the obvious next step.

I would also reach for the demo earlier. The layout maths was right for months while the diagram
rendered at a third of its size in a panel too narrow for it, with labels under 4px. Tests do not
catch that. Opening the page does.

Live demo: [apps.charliekrug.com/branchreel](https://apps.charliekrug.com/branchreel/)
Source: [github.com/ctkrug/branchreel](https://github.com/ctkrug/branchreel)
