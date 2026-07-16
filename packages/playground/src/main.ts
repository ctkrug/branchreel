import { PlayerController, type BranchChoice } from "branchreel";
import { GraphView } from "./graph-view.js";
import { SoundEngine } from "./audio.js";
import { formatTime, resolveSegmentEnd, segmentProgress, segmentTimeAt } from "./format.js";
import { story } from "./story.js";

const video = document.querySelector<HTMLVideoElement>("#video")!;
const startOverlay = document.querySelector<HTMLDivElement>("#start-overlay")!;
const startButton = document.querySelector<HTMLButtonElement>("#start")!;
const choiceOverlay = document.querySelector<HTMLDivElement>("#choice-overlay")!;
const choiceList = document.querySelector<HTMLDivElement>("#choice-list")!;
const endOverlay = document.querySelector<HTMLDivElement>("#end-overlay")!;
const endPath = document.querySelector<HTMLParagraphElement>("#end-overlay__path")!;
const restartButton = document.querySelector<HTMLButtonElement>("#restart")!;
const scrubberInput = document.querySelector<HTMLInputElement>("#scrubber")!;
const scrubberTime = document.querySelector<HTMLSpanElement>("#scrubber-time")!;
const graphSvg = document.querySelector<SVGSVGElement>("#graph-view")!;
const graphToggle = document.querySelector<HTMLButtonElement>("#graph-toggle")!;
const graphWrap = document.querySelector<HTMLDivElement>("#graph-view-wrap")!;
const muteToggle = document.querySelector<HTMLButtonElement>("#mute-toggle")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;

const sound = new SoundEngine();
const graphView = new GraphView(graphSvg, story);

function announce(message: string): void {
  statusEl.textContent = message;
}

// --- mute toggle -----------------------------------------------------

function syncMuteButton(): void {
  muteToggle.setAttribute("aria-pressed", String(sound.isMuted));
  muteToggle.setAttribute(
    "aria-label",
    sound.isMuted ? "Unmute sound effects" : "Mute sound effects",
  );
}
syncMuteButton();
muteToggle.addEventListener("click", () => {
  sound.toggleMuted();
  syncMuteButton();
});

// --- graph panel collapse (phone) -------------------------------------

graphToggle.addEventListener("click", () => {
  const expanded = graphToggle.getAttribute("aria-expanded") === "true";
  graphToggle.setAttribute("aria-expanded", String(!expanded));
  graphWrap.classList.toggle("is-open", !expanded);
});

// --- scrubber ----------------------------------------------------------

let rafId: number | undefined;
let scrubbing = false;

function currentSegmentBounds(controller: PlayerController): { start: number; end: number } {
  const node = controller.current;
  return { start: node.start ?? 0, end: resolveSegmentEnd(node.end, video.duration) };
}

function updateScrubber(controller: PlayerController): void {
  if (scrubbing) return;
  const { start, end } = currentSegmentBounds(controller);
  scrubberInput.value = String(segmentProgress(video.currentTime, start, end));
  scrubberTime.textContent = `${formatTime(video.currentTime - start)} / ${formatTime(end - start)}`;
}

function startScrubTicker(controller: PlayerController): void {
  const tick = () => {
    updateScrubber(controller);
    if (!video.paused) rafId = requestAnimationFrame(tick);
  };
  if (rafId !== undefined) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

video.addEventListener("play", () => startScrubTicker(activeController));
video.addEventListener("pause", () => {
  if (rafId !== undefined) cancelAnimationFrame(rafId);
  updateScrubber(activeController);
});

scrubberInput.addEventListener("input", () => {
  scrubbing = true;
  const { start, end } = currentSegmentBounds(activeController);
  video.currentTime = segmentTimeAt(Number(scrubberInput.value), start, end);
  scrubberTime.textContent = `${formatTime(video.currentTime - start)} / ${formatTime(end - start)}`;
});
scrubberInput.addEventListener("change", () => {
  scrubbing = false;
});

// --- choice / end overlays ---------------------------------------------

function renderChoices(controller: PlayerController, choices: BranchChoice[]): void {
  choiceList.innerHTML = "";
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice.label;
    button.addEventListener("mouseenter", () => sound.hover());
    button.addEventListener("click", () => {
      sound.choice();
      controller.choose(choice.id);
    });
    choiceList.appendChild(button);
  }
  choiceOverlay.hidden = false;
  announce(`Choose what happens next: ${choices.map((c) => c.label).join(", ")}`);
}

function wireController(controller: PlayerController): void {
  controller.addEventListener("choice", (event) => {
    const { choices } = (event as CustomEvent<{ choices: BranchChoice[] }>).detail;
    renderChoices(controller, choices);
  });

  controller.addEventListener("branch", (event) => {
    const { history } = (event as CustomEvent<{ history: readonly string[] }>).detail;
    choiceOverlay.hidden = true;
    graphView.highlightPath(history);
    sound.branchLit();
    announce(`Now playing: ${controller.current.id}`);
  });

  controller.addEventListener("end", (event) => {
    const { history } = (event as CustomEvent<{ history: readonly string[] }>).detail;
    endPath.textContent = `Your path: ${history.join(" → ")}`;
    endOverlay.hidden = false;
    sound.storyEnd();
    announce("End of this path. Play again to try another branch.");
  });
}

// --- lifecycle -----------------------------------------------------------

let activeController: PlayerController = new PlayerController(video, story);
wireController(activeController);
graphView.highlightPath(activeController.history);

function playFromStart(): void {
  activeController.dispose();
  activeController = new PlayerController(video, story);
  wireController(activeController);
  graphView.highlightPath(activeController.history);
  choiceOverlay.hidden = true;
  endOverlay.hidden = true;
  startOverlay.hidden = true;
  video.play().catch(() => {});
  announce(`Now playing: ${activeController.current.id}`);
}

startButton.addEventListener("click", () => {
  startOverlay.hidden = true;
  video.play().catch(() => {});
  announce(`Now playing: ${activeController.current.id}`);
});

restartButton.addEventListener("click", playFromStart);
