'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { debugLog } from '@/app/lib/logger';

interface VideoComponentProps {
  src: string | undefined | null;
  className?: string;
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

function HlsPlayer({ src, className = '' }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) return;

    const hls = new Hls({
      startLevel: -1,
      capLevelToPlayerSize: true,
    });

    hls.loadSource(src);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
    };
  }, [src]);

  return (
    <div className={`aspect-video w-full ${className}`}>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        className="w-full h-full rounded-xl bg-black"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default function VideoComponent({ src, className = '' }: VideoComponentProps) {
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
    return <HlsPlayer src={url} className={className} />;
  }

  if (isSelfHostedVideo(url)) {
    debugLog('VideoComponent', 'using self-hosted video', url);
    return (
      <div className={`aspect-video w-full ${className}`}>
        <video
          src={url}
          controls
          preload="metadata"
          className="w-full h-full rounded-xl bg-black"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    debugLog('VideoComponent', 'unsupported URL (not HLS, self-hosted, or embed)', url);
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Unsupported video URL.</div>;
  }

  debugLog('VideoComponent', 'using embed', embedUrl);
  return (
    <div className={`aspect-video w-full ${className}`}>
      <iframe
        src={embedUrl}
        className="w-full h-full rounded-xl"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
}
