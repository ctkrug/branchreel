import type { BranchGraph } from "branchreel";

import introUrl from "./media/intro.mp4?url";
import corridorUrl from "./media/corridor.mp4?url";
import engineRoomUrl from "./media/engine-room.mp4?url";
import cockpitUrl from "./media/cockpit.mp4?url";
import endingQuietUrl from "./media/ending-quiet.mp4?url";
import endingHeroUrl from "./media/ending-hero.mp4?url";
import endingEscapeUrl from "./media/ending-escape.mp4?url";
import endingSignalUrl from "./media/ending-signal.mp4?url";

/**
 * "The Signal" — the playground's sample story. Three branch points, four
 * distinct endings. Every `src` is a 3-second placeholder clip (see
 * `src/media/README.md`); swap them for real footage without touching
 * anything else here.
 */
export const story: BranchGraph = {
  start: "intro",
  nodes: [
    {
      id: "intro",
      src: introUrl,
      end: 3,
      choices: [
        { id: "investigate", label: "Investigate the signal", target: "corridor" },
        { id: "ignore", label: "Ignore it and stay put", target: "ending-quiet" },
      ],
    },
    {
      id: "corridor",
      src: corridorUrl,
      end: 3,
      choices: [
        { id: "left", label: "Head toward the engine room", target: "engine-room" },
        { id: "right", label: "Head toward the cockpit", target: "cockpit" },
      ],
    },
    {
      id: "engine-room",
      src: engineRoomUrl,
      end: 3,
      choices: [
        { id: "repair", label: "Attempt a repair", target: "ending-hero" },
        { id: "vent", label: "Vent the plasma coolant", target: "ending-escape" },
      ],
    },
    {
      id: "cockpit",
      src: cockpitUrl,
      end: 3,
      choices: [{ id: "transmit", label: "Send the transmission", target: "ending-signal" }],
    },
    { id: "ending-quiet", src: endingQuietUrl },
    { id: "ending-hero", src: endingHeroUrl },
    { id: "ending-escape", src: endingEscapeUrl },
    { id: "ending-signal", src: endingSignalUrl },
  ],
};
