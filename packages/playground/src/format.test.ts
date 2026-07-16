import { describe, expect, it } from "vitest";
import {
  formatTime,
  resolveSegmentEnd,
  segmentProgress,
  segmentTimeAt,
} from "./format.js";

describe("formatTime", () => {
  it("formats seconds under a minute", () => {
    expect(formatTime(7)).toBe("0:07");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("2:05");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(59.9)).toBe("0:59");
  });

  it("clamps negative or non-finite input to 0:00", () => {
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });

  it("formats exactly zero", () => {
    expect(formatTime(0)).toBe("0:00");
  });
});

describe("resolveSegmentEnd", () => {
  it("prefers the node's own end timecode", () => {
    expect(resolveSegmentEnd(12, 30)).toBe(12);
  });

  it("falls back to media duration when the node has no end", () => {
    expect(resolveSegmentEnd(undefined, 30)).toBe(30);
  });

  it("falls back to 0 when duration is not yet known (NaN)", () => {
    expect(resolveSegmentEnd(undefined, NaN)).toBe(0);
  });
});

describe("segmentProgress", () => {
  it("computes the fraction played within [start, end)", () => {
    expect(segmentProgress(5, 0, 10)).toBe(0.5);
  });

  it("clamps below start to 0", () => {
    expect(segmentProgress(-3, 0, 10)).toBe(0);
  });

  it("clamps above end to 1", () => {
    expect(segmentProgress(99, 0, 10)).toBe(1);
  });

  it("returns 0 for a zero-length segment instead of dividing by zero", () => {
    expect(segmentProgress(5, 10, 10)).toBe(0);
  });

  it("returns 0 for an inverted (end <= start) segment", () => {
    expect(segmentProgress(5, 10, 2)).toBe(0);
  });
});

describe("segmentTimeAt", () => {
  it("is the inverse of segmentProgress at the midpoint", () => {
    expect(segmentTimeAt(0.5, 0, 10)).toBe(5);
  });

  it("clamps fractions outside 0–1", () => {
    expect(segmentTimeAt(-1, 0, 10)).toBe(0);
    expect(segmentTimeAt(2, 0, 10)).toBe(10);
  });

  it("handles a non-zero start offset", () => {
    expect(segmentTimeAt(0.5, 4, 8)).toBe(6);
  });
});
