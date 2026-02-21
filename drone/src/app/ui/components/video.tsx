'use client';

interface VideoComponentProps {
  src: string;
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

function isSelfHostedVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ||
    url.includes('cloudfront.net') ||
    url.includes('media.');
}

export default function VideoComponent({ src, className = '' }: VideoComponentProps) {
  if (isSelfHostedVideo(src)) {
    return (
      <div className={`aspect-video w-full ${className}`}>
        <video
          src={src}
          controls
          preload="metadata"
          className="w-full h-full rounded-xl bg-black"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(src);

  if (!embedUrl) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Unsupported video URL.</div>;
  }

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
