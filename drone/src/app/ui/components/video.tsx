'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { debugLog } from '@/app/lib/logger';
import { onBeforeLeave, publishVideoState, track } from '@/app/lib/analytics';

interface VideoComponentProps {
  src: string | undefined | null;
  className?: string;
  title?: string;
  captionsSrc?: string;
  /** When both are set, playback is tracked (video_* events, resume point). */
  courseId?: number;
  unitRef?: string;
  /** Seconds to start from (resume). 0 / undefined = start at the beginning. */
  startPosition?: number;
  /** Trailing credits / end card excluded from the completion rule. */
  outroSeconds?: number;
}

interface TrackingOptions {
  courseId?: number;
  unitRef?: string;
  startPosition?: number;
  outroSeconds?: number;
}

const MILESTONES = [25, 50, 75] as const;
const LOCAL_MIRROR_MS = 5000;

/**
 * Completion rule — mirror of backend/src/product-events/video-completion.ts
 * (docs/tech/progress-tracking-accuracy.md § 3). The server recomputes from
 * the ranges and is authoritative; this only decides when to send
 * `video_completed`. Keep the constants in sync.
 */
function isWatched(merged: number[][], duration: number, outroSeconds = 0): boolean {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  const content = duration - Math.min(Math.max(0, outroSeconds), duration * 0.5);
  const required = Math.max(0.75 * content, Math.min(0.9 * content, content - 10));
  let watched = 0;
  for (const [a, b] of merged) {
    const end = Math.min(b, content);
    if (end > a) watched += end - Math.max(0, a);
  }
  return watched >= required;
}

export const localVideoKey = (courseId: number, unitRef: string) =>
  `de:video:${courseId}:${unitRef}`;

/**
 * `video_started` once per video per tab session — reloads, revisits and
 * "Start over" remount the player but are not new plays (R21).
 */
function firstStartThisSession(courseId: number, unitRef: string): boolean {
  try {
    const key = `de:video-started:${courseId}:${unitRef}`;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* storage unavailable — count the play */
  }
  return true;
}

function mergeRanges(ranges: number[][]): number[][] {
  const sorted = ranges
    .filter((r) => r.length === 2 && r[1] > r[0])
    .map(([a, b]) => [a, b])
    .sort((x, y) => x[0] - y[0]);
  const out: number[][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/**
 * Attaches playback tracking to a <video> element (HLS or native):
 *  • watched ranges from timeupdate (seeks start a new range) → % watched is
 *    the union, so scrubbing to the end does not count as watching
 *  • video_started once per video per tab session, video_progress at
 *    25/50/75 %, video_completed once the completion rule is met (isWatched);
 *    `ended` without meeting it only flushes the ranges
 *  • live state published for the lesson heartbeat (position rides the 30 s tick)
 *  • unsent ranges are sent as `video_position` when the player unmounts and
 *    right before the page-leaving beacon (section videos have no heartbeat
 *    of their own — R9)
 *  • localStorage mirror every 5 s as an offline / pre-fetch resume fallback
 * Resume lives in its own effect so a late resume point (unsigned files get
 * it after mount) seeks without resetting the watched ranges.
 */
function useVideoTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  src: string,
  { courseId, unitRef, startPosition, outroSeconds }: TrackingOptions,
): void {
  // Resume applies even when tracking is off (guest preview never has one).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !startPosition || startPosition <= 0) return;
    const seek = () => {
      // Never yank a learner who already started watching from the top.
      if (video.currentTime > 1 || !Number.isFinite(video.duration)) return;
      if (startPosition < video.duration - 5) video.currentTime = startPosition;
    };
    if (video.readyState >= 1) {
      seek();
      return;
    }
    video.addEventListener('loadedmetadata', seek);
    return () => video.removeEventListener('loadedmetadata', seek);
  }, [videoRef, src, startPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !courseId || !unitRef) return;

    let allRanges: number[][] = [];
    const pending: number[][] = [];
    let current: number[] | null = null;
    let lastTime = -1;
    let started = false;
    let completed = false;
    let lastMirror = 0;
    const hit = new Set<number>();

    const closeRange = () => {
      if (current && current[1] - current[0] >= 1) {
        const r = [Math.floor(current[0]), Math.ceil(current[1])];
        allRanges = mergeRanges([...allRanges, r]);
        pending.push(r);
      }
      current = null;
    };

    const watchedRanges = () => mergeRanges([...allRanges, ...(current ? [current] : [])]);
    const watchedPct = () => {
      const d = video.duration;
      if (!Number.isFinite(d) || d <= 0) return 0;
      const total = watchedRanges().reduce((s, [a, b]) => s + (b - a), 0);
      return Math.min(100, Math.round((100 * total) / d));
    };
    const ruleMet = () => isWatched(watchedRanges(), video.duration, outroSeconds);

    const base = () => ({
      courseId,
      unitRef,
      position: Math.round(video.currentTime),
      duration: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
    });

    const onPlay = () => {
      if (!started) {
        started = true;
        if (firstStartThisSession(courseId, unitRef)) track('video_started', base());
      }
    };
    const onTime = () => {
      const t = video.currentTime;
      if (lastTime >= 0 && t > lastTime && t - lastTime < 2) {
        if (current) current[1] = t;
        else current = [lastTime, t];
      } else if (lastTime >= 0 && (t < lastTime || t - lastTime >= 2)) {
        closeRange();
      }
      lastTime = t;

      const pct = watchedPct();
      for (const m of MILESTONES) {
        if (pct >= m && !hit.has(m)) {
          hit.add(m);
          closeRange();
          track('video_progress', { ...base(), ranges: pending.splice(0), properties: { milestone: m, percent_watched: pct } });
        }
      }
      if (!completed && ruleMet()) {
        completed = true;
        closeRange();
        track('video_completed', { ...base(), ranges: pending.splice(0), properties: { percent_watched: pct } });
      }

      const now = Date.now();
      if (now - lastMirror > LOCAL_MIRROR_MS) {
        lastMirror = now;
        try {
          window.localStorage.setItem(
            localVideoKey(courseId, unitRef),
            JSON.stringify({ position: Math.round(t), updatedAt: now }),
          );
        } catch {
          /* storage unavailable */
        }
      }
    };
    const onSeeking = () => closeRange();
    const onEnded = () => {
      closeRange();
      if (!completed && ruleMet()) {
        completed = true;
        track('video_completed', { ...base(), ranges: pending.splice(0), properties: { percent_watched: watchedPct(), ended: true } });
      } else if (pending.length) {
        // Reached the end without the rule (scrubbed): still deliver the ranges.
        track('video_progress', { ...base(), ranges: pending.splice(0), properties: { percent_watched: watchedPct(), ended: true } });
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('ended', onEnded);

    const flushRanges = () => {
      closeRange();
      if (pending.length) {
        track('video_position', { ...base(), ranges: pending.splice(0) });
      }
    };
    const offLeave = onBeforeLeave(flushRanges);

    publishVideoState(unitRef, {
      get position() {
        return video.currentTime;
      },
      get duration() {
        return Number.isFinite(video.duration) ? video.duration : 0;
      },
      get playing() {
        return !video.paused && !video.ended;
      },
      takeRanges: () => {
        closeRange();
        return pending.splice(0);
      },
    });

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('ended', onEnded);
      offLeave();
      flushRanges();
      publishVideoState(unitRef, null);
    };
  }, [videoRef, src, courseId, unitRef, outroSeconds]);
}

function getEmbedUrl(url: string): string | null {
  let videoId: string | null | undefined = null;

  if (url.includes('youtube.com/watch')) {
    videoId = new URL(url).searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (url.includes('youtu.be')) {
    videoId = new URL(url).pathname.slice(1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (url.includes('vimeo.com')) {
    videoId = new URL(url).pathname.split('/').pop();
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  return null;
}

function isHlsStream(url: string): boolean {
  return /\.m3u8(\?.*)?$/i.test(url);
}

function isSelfHostedVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ||
    url.includes('cloudfront.net') ||
    url.includes('media.');
}

function HlsPlayer({
  src,
  className = '',
  title,
  captionsSrc,
  tracking,
}: {
  src: string;
  className?: string;
  title?: string;
  captionsSrc?: string;
  tracking: TrackingOptions;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoTracking(videoRef, src, tracking);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Paid course streams are authorized via CloudFront signed cookies set by
    // the backend, so playlist/segment requests must carry credentials.
    const useCredentials = isSelfHostedVideo(src);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (iOS Safari): media requests send same-site cookies
      // automatically; no crossorigin attribute needed.
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) return;

    const hls = new Hls({
      startLevel: -1,
      capLevelToPlayerSize: true,
      // Resume point: hls.js seeks before the first fragment loads, so no
      // wasted download of the opening segments.
      ...(tracking.startPosition && tracking.startPosition > 0 && {
        startPosition: tracking.startPosition,
      }),
      ...(useCredentials && {
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = true;
        },
      }),
    });

    hls.loadSource(src);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
    };
    // startPosition is intentionally read once per source; changing it
    // mid-playback must not rebuild the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className={`aspect-video w-full ${className}`}>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        aria-label={title?.trim() || 'Course video'}
        className="w-full h-full rounded-xl bg-black"
      >
        {captionsSrc && (
          <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function NativePlayer({
  src,
  className = '',
  title,
  captionsSrc,
  tracking,
}: {
  src: string;
  className?: string;
  title?: string;
  captionsSrc?: string;
  tracking: TrackingOptions;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoTracking(videoRef, src, tracking);
  return (
    <div className={`aspect-video w-full ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        className="w-full h-full rounded-xl bg-black"
        aria-label={title?.trim() || 'Course video'}
      >
        {captionsSrc && (
          <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default function VideoComponent({
  src,
  className = '',
  title,
  captionsSrc,
  courseId,
  unitRef,
  startPosition,
  outroSeconds,
}: VideoComponentProps) {
  const tracking: TrackingOptions = { courseId, unitRef, startPosition, outroSeconds };
  const url = typeof src === 'string' ? src.trim() : '';
  debugLog('VideoComponent', {
    src: src ?? null,
    url: url || '(empty)',
    urlLength: url.length,
    isHls: url ? isHlsStream(url) : false,
    isSelfHosted: url ? isSelfHostedVideo(url) : false,
    embedUrl: url ? getEmbedUrl(url) : null,
  });
  if (!url) {
    debugLog('VideoComponent', 'no url, showing placeholder');
    return (
      <div className={`aspect-video w-full flex items-center justify-center bg-[var(--surface)] ${className}`} style={{ borderRadius: 'var(--radius-sm)' }}>
        <span className="text-sm text-[var(--brand-muted)]">No video URL</span>
      </div>
    );
  }

  if (isHlsStream(url)) {
    debugLog('VideoComponent', 'using HlsPlayer', url);
    return <HlsPlayer src={url} className={className} title={title} captionsSrc={captionsSrc} tracking={tracking} />;
  }

  if (isSelfHostedVideo(url)) {
    debugLog('VideoComponent', 'using self-hosted video', url);
    return <NativePlayer src={url} className={className} title={title} captionsSrc={captionsSrc} tracking={tracking} />;
  }

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    debugLog('VideoComponent', 'unsupported URL (not HLS, self-hosted, or embed)', url);
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Unsupported video URL.</div>;
  }

  debugLog('VideoComponent', 'using embed', embedUrl);
  const embedTitle = title?.trim() || 'Embedded course video';
  return (
    <div className={`aspect-video w-full ${className}`}>
      <iframe
        src={embedUrl}
        title={embedTitle}
        className="w-full h-full rounded-xl"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
