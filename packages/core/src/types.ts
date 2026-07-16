/**
 * A single choice a viewer can make at a branch point.
 */
export interface BranchChoice {
  /** Unique within the node's `choices` array. */
  id: string;
  /** Label shown on the choice prompt overlay. */
  label: string;
  /** Id of the {@link BranchNode} this choice leads to. */
  target: string;
}

/**
 * One segment of the story: a span of video plus the choices available
 * once that span finishes playing.
 */
export interface BranchNode {
  /** Unique id, referenced by `BranchGraph.start` and `BranchChoice.target`. */
  id: string;
  /** Video source URL for this segment. */
  src: string;
  /** Start offset in seconds within `src`. Defaults to 0. */
  start?: number;
  /** End offset in seconds within `src`. Defaults to the media's duration. */
  end?: number;
  /** Choices offered when playback reaches `end`. Omitted/empty means terminal. */
  choices?: BranchChoice[];
}

/**
 * The full story shape: every node plus which one playback begins at.
 */
export interface BranchGraph {
  /** Id of the {@link BranchNode} playback starts from. */
  start: string;
  nodes: BranchNode[];
}
