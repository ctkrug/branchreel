/** Formats seconds as `m:ss`, clamping non-finite/negative input to `0:00`. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * The end of the current segment: the node's own `end` timecode if set,
 * otherwise the underlying media's duration (0 while metadata is still
 * loading, since `HTMLMediaElement.duration` is `NaN` until then).
 */
export function resolveSegmentEnd(
  nodeEnd: number | undefined,
  mediaDuration: number,
): number {
  if (nodeEnd !== undefined) return nodeEnd;
  return Number.isFinite(mediaDuration) ? mediaDuration : 0;
}

/**
 * Fraction (0–1) of the current segment played, given the segment's
 * `[start, end)` bounds. Returns 0 for a zero-or-negative-length segment
 * instead of dividing by zero.
 */
export function segmentProgress(
  currentTime: number,
  start: number,
  end: number,
): number {
  if (end <= start) return 0;
  const clamped = Math.min(Math.max(currentTime, start), end);
  return (clamped - start) / (end - start);
}

/** Inverse of {@link segmentProgress}: maps a 0–1 fraction back to a time. */
export function segmentTimeAt(fraction: number, start: number, end: number): number {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return start + clamped * (end - start);
}
