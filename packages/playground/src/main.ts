import { BranchStateMachine, type BranchGraph } from "branchreel";

// Placeholder graph so the playground proves out the library wiring end to
// end. Real video segments and the full playback UI land in the BUILD phase.
const demoGraph: BranchGraph = {
  start: "intro",
  nodes: [
    {
      id: "intro",
      src: "intro.mp4",
      choices: [
        { id: "brave", label: "Open the door", target: "hallway" },
        { id: "cautious", label: "Turn back", target: "ending-safe" },
      ],
    },
    { id: "hallway", src: "hallway.mp4" },
    { id: "ending-safe", src: "ending-safe.mp4" },
  ],
};

const machine = new BranchStateMachine(demoGraph);
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
statusEl.textContent = `library loaded — current node: "${machine.current.id}"`;
