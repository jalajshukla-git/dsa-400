import { useEffect, useRef } from 'react';
import { registerVideo, seekAllVideos } from '../../lib/note-video';

/* YouTube embed — registers itself so timestamp chips can seek into it. */
export function VideoEmbed({ videoId, title }) {
  const ref = useRef(null);
  useEffect(() => registerVideo(ref.current), [videoId]);
  return (
    <figure className="n-video">
      <div className="n-video-box">
        <iframe
          ref={ref}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`}
          title={title || 'video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {title ? <figcaption className="n-video-cap">{title}</figcaption> : null}
    </figure>
  );
}

/* Clickable [12:34] timestamp → seek the video. */
export function Timestamp({ seconds, label }) {
  return (
    <button
      className="n-ts"
      type="button"
      title={`Jump to ${label}`}
      onClick={() => seekAllVideos(seconds)}
    >
      ▶ {label}
    </button>
  );
}
