import { BranchStateMachine } from "./StateMachine.js";
import type { BranchGraph, BranchNode } from "./types.js";

/**
 * The subset of `HTMLVideoElement` the controller needs. A real
 * `<video>` element satisfies this directly; tests can supply a plain
 * `EventTarget` with fake `src`/`currentTime`/`play`/`pause`, which keeps
 * the branch-switching logic testable without a DOM.
 */
export interface VideoHost extends EventTarget {
  src: string;
  currentTime: number;
  play(): void | Promise<void>;
  pause(): void;
  load?(): void;
}

export interface PlayerControllerOptions {
  /** Factory for hidden hosts used to warm the browser cache for choice targets. */
  createPreloadHost?: () => VideoHost;
  /** Start playing the graph's start node immediately. Defaults to false. */
  autoplay?: boolean;
}

function defaultCreatePreloadHost(): VideoHost {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  return video;
}

/**
 * Drives a `<video>` element through a {@link BranchGraph}: loads each
 * node's segment, surfaces a `choice` event when a branch point is
 * reached, and performs the click-to-branch jump-cut on {@link choose}.
 * Every reachable choice target starts preloading as soon as its node
 * begins playing, so the jump-cut never stalls on a network request.
 */
export class PlayerController extends EventTarget {
  private readonly machine: BranchStateMachine;
  private readonly host: VideoHost;
  private readonly createPreloadHost: () => VideoHost;
  private readonly preloaded = new Map<string, VideoHost>();
  private awaitingChoice = false;

  private readonly onTimeUpdate = () => this.checkForNodeEnd();
  private readonly onEnded = () => this.handleNodeEnd();

  constructor(
    host: VideoHost,
    graph: BranchGraph,
    options: PlayerControllerOptions = {},
  ) {
    super();
    this.host = host;
    this.machine = new BranchStateMachine(graph);
    this.createPreloadHost =
      options.createPreloadHost ?? defaultCreatePreloadHost;

    this.host.addEventListener("timeupdate", this.onTimeUpdate);
    this.host.addEventListener("ended", this.onEnded);

    this.loadCurrentNode(options.autoplay ?? false);
  }

  /** The node currently being played. */
  get current(): BranchNode {
    return this.machine.current;
  }

  /** Ids of every node visited so far, including the current one. */
  get history(): readonly string[] {
    return this.machine.history;
  }

  /** Choices available from the current node. Empty for a terminal node. */
  get choices() {
    return this.machine.choices();
  }

  /**
   * Follows a choice and jump-cuts the host to its target node. The
   * target's src was set on the host synchronously, so there is no
   * `await` between the click and the new frame appearing.
   */
  choose(choiceId: string): BranchNode {
    const target = this.machine.choose(choiceId);
    this.awaitingChoice = false;
    this.preloaded.get(target.id)?.pause();
    this.preloaded.delete(target.id);

    this.host.src = target.src;
    this.host.currentTime = target.start ?? 0;
    this.host.play();

    this.dispatchEvent(
      new CustomEvent("branch", {
        detail: { node: target, history: this.machine.history },
      }),
    );

    this.preloadChoiceTargets(target);
    return target;
  }

  /** Removes host listeners and releases preload hosts. */
  dispose(): void {
    this.host.removeEventListener("timeupdate", this.onTimeUpdate);
    this.host.removeEventListener("ended", this.onEnded);
    for (const preloadHost of this.preloaded.values()) {
      preloadHost.pause();
    }
    this.preloaded.clear();
  }

  private loadCurrentNode(autoplay: boolean): void {
    const node = this.machine.current;
    this.host.src = node.src;
    this.host.currentTime = node.start ?? 0;
    if (autoplay) this.host.play();
    this.preloadChoiceTargets(node);
  }

  private preloadChoiceTargets(node: BranchNode): void {
    for (const choice of node.choices ?? []) {
      if (this.preloaded.has(choice.target)) continue;
      const targetNode = this.machine.nodeById(choice.target);
      if (!targetNode) continue;

      const preloadHost = this.createPreloadHost();
      // A failed preload is not fatal: choose() always sets the main
      // host's src directly, which falls back to a normal load.
      preloadHost.addEventListener("error", () => {
        this.preloaded.delete(choice.target);
      });
      preloadHost.src = targetNode.src;
      preloadHost.load?.();
      this.preloaded.set(choice.target, preloadHost);
    }
  }

  private checkForNodeEnd(): void {
    if (this.awaitingChoice) return;
    const node = this.machine.current;
    if (node.end !== undefined && this.host.currentTime >= node.end) {
      this.handleNodeEnd();
    }
  }

  private handleNodeEnd(): void {
    if (this.awaitingChoice) return;
    this.host.pause();

    if (this.machine.isTerminal()) {
      this.dispatchEvent(
        new CustomEvent("end", { detail: { history: this.machine.history } }),
      );
      return;
    }

    this.awaitingChoice = true;
    this.dispatchEvent(
      new CustomEvent("choice", { detail: { choices: this.machine.choices() } }),
    );
  }
}
