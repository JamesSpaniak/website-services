import {
  contentSeconds,
  isVideoWatched,
  requiredWatchSeconds,
  watchedSecondsWithin,
} from './video-completion';
import { mergeRanges, sanitizeRanges } from './product-events.service';

describe('video completion rule', () => {
  it('requires 90 % on long videos (stopping 30 s early on a 5 min video still counts)', () => {
    expect(requiredWatchSeconds(300)).toBe(270);
    expect(isVideoWatched([[0, 270]], 300)).toBe(true);
    expect(isVideoWatched([[0, 260]], 300)).toBe(false);
  });

  it('allows a 10 s end grace on short videos', () => {
    expect(requiredWatchSeconds(60)).toBe(50);
    expect(isVideoWatched([[0, 52]], 60)).toBe(true);
    expect(isVideoWatched([[0, 45]], 60)).toBe(false);
  });

  it('keeps a 75 % floor on very short clips', () => {
    expect(requiredWatchSeconds(15)).toBeCloseTo(11.25);
    expect(isVideoWatched([[0, 6]], 15)).toBe(false);
    expect(isVideoWatched([[0, 12]], 15)).toBe(true);
  });

  it('ignores the outro: credits never need to be watched', () => {
    // 3:00 video with a 25 s outro → content 155 s → need 145 s of it
    expect(contentSeconds(180, 25)).toBe(155);
    expect(isVideoWatched([[0, 146]], 180, 25)).toBe(true);
    expect(isVideoWatched([[0, 146]], 180)).toBe(false);
  });

  it('caps the outro at half the video', () => {
    expect(contentSeconds(100, 90)).toBe(50);
  });

  it('does not count seconds watched inside the outro', () => {
    expect(watchedSecondsWithin([[150, 180]], 155)).toBe(5);
    expect(
      isVideoWatched(
        [
          [0, 100],
          [150, 180],
        ],
        180,
        25,
      ),
    ).toBe(false);
  });

  it('never completes from a scrub to the end', () => {
    expect(
      isVideoWatched(
        [
          [0, 8],
          [295, 300],
        ],
        300,
      ),
    ).toBe(false);
  });

  it('never completes without a known duration', () => {
    expect(isVideoWatched([[0, 500]], null)).toBe(false);
  });

  it('counts replays once (union of ranges)', () => {
    const merged = mergeRanges([
      [0, 30],
      [0, 30],
      [10, 40],
    ]);
    expect(merged).toEqual([[0, 40]]);
    expect(watchedSecondsWithin(merged, 300)).toBe(40);
  });

  it('sanitizes ranges: swaps reversed, clips to duration, drops junk', () => {
    expect(
      sanitizeRanges(
        [
          [20, 10],
          [-5, 3],
          [290, 400],
          [5, 5],
          ['x' as unknown as number, 1],
        ],
        300,
      ),
    ).toEqual([
      [10, 20],
      [0, 3],
      [290, 300],
    ]);
  });
});
