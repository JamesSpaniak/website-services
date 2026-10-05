/**
 * Video completion rule (docs/tech/progress-tracking-accuracy.md § 3).
 *
 *   content   = duration − outro            (outro capped at 50 % of duration)
 *   watched   = distinct seconds played inside [0, content]
 *   required  = max(0.75 × content, min(0.90 × content, content − 10 s))
 *   completed = watched ≥ required
 *
 * Learners who stop in the last few seconds (end card, credits) still get the
 * ✓; scrubbing never does, because only merged watched ranges count.
 * Mirrored client-side in drone/src/app/ui/components/video.tsx — keep in sync.
 */
export const VIDEO_COMPLETE_RATIO = 0.9;
export const VIDEO_COMPLETE_FLOOR_RATIO = 0.75;
export const VIDEO_END_GRACE_SECONDS = 10;
const MAX_OUTRO_RATIO = 0.5;

/** Seconds of the video that count toward completion (duration minus outro). */
export function contentSeconds(
  duration: number,
  outroSeconds?: number | null,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const outro = Math.min(
    Math.max(0, Number(outroSeconds) || 0),
    duration * MAX_OUTRO_RATIO,
  );
  return duration - outro;
}

/** Watched seconds needed for the ✓, given the countable content length. */
export function requiredWatchSeconds(content: number): number {
  if (content <= 0) return Infinity;
  return Math.max(
    VIDEO_COMPLETE_FLOOR_RATIO * content,
    Math.min(VIDEO_COMPLETE_RATIO * content, content - VIDEO_END_GRACE_SECONDS),
  );
}

/** Distinct seconds covered by merged [start, end] ranges, clipped to [0, limit]. */
export function watchedSecondsWithin(
  merged: number[][],
  limit: number,
): number {
  let total = 0;
  for (const [a, b] of merged) {
    const end = Math.min(b, limit);
    if (end > a) total += end - Math.max(0, a);
  }
  return total;
}

export function isVideoWatched(
  merged: number[][],
  duration: number | null | undefined,
  outroSeconds?: number | null,
): boolean {
  if (!duration || duration <= 0) return false;
  const content = contentSeconds(duration, outroSeconds);
  return watchedSecondsWithin(merged, content) >= requiredWatchSeconds(content);
}
