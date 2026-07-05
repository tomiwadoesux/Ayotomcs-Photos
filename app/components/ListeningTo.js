"use client";
import { useState, useEffect } from "react";

const MUSIC_API_BASE =
  process.env.NEXT_PUBLIC_MUSIC_API_BASE || "https://ayotomcs.me";

// Only show a track if it was played within this window of the photo time
const MAX_DIFF_MINUTES = 180;

// EXIF dates have no timezone — the site displays them as UTC, so query as UTC too
function toIso(rawDate) {
  if (!rawDate) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(rawDate);
  const d = new Date(hasZone ? rawDate : `${rawDate}Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Pick a random quotable lyric line, skipping filler ("Yeah", "Mmm", ad-libs)
function pickLyricQuote(lines) {
  if (!lines || lines.length === 0) return null;
  const quotable = lines.filter(
    (line) => line.length >= 12 && !/^[(\[]/.test(line)
  );
  const pool = quotable.length > 0 ? quotable : lines;
  return pool[Math.floor(Math.random() * pool.length)];
}

const Label = () => (
  <p className="text-xs text-foreground/40 flex items-center gap-1.5">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
    <span>WAS LISTENING TO</span>
  </p>
);

export default function ListeningTo({ rawDate, song, utcTime }) {
  const [track, setTrack] = useState(null);
  // "loading" while we fetch, "done" once resolved (with or without a track)
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setTrack(null);

    const withQuote = (t) => ({ ...t, lyricQuote: pickLyricQuote(t.lyricsSnippet) });
    const finish = (t) => {
      if (cancelled) return;
      if (t) setTrack(t);
      setStatus("done");
    };

    // A manually tagged song wins over the automatic time lookup
    if (song) {
      fetch(`${MUSIC_API_BASE}/api/spotify/track?q=${encodeURIComponent(song)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => finish(data?.title ? withQuote(data) : null))
        .catch(() => finish(null));
      return () => {
        cancelled = true;
      };
    }

    // Server-computed true UTC wins; toIso is only a legacy fallback
    const iso = utcTime || toIso(rawDate);
    if (!iso) {
      setStatus("done");
      return () => {
        cancelled = true;
      };
    }

    fetch(
      `${MUSIC_API_BASE}/api/spotify/at?time=${encodeURIComponent(iso)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const c = data?.closest;
        finish(c && c.diffMinutes <= MAX_DIFF_MINUTES ? withQuote(c) : null);
      })
      .catch(() => finish(null));

    return () => {
      cancelled = true;
    };
  }, [rawDate, song, utcTime]);

  // Skeleton placeholder: cover square + song/artist/lyric bars
  if (status === "loading") {
    return (
      <div className="space-y-2 pt-2 animate-pulse">
        <Label />
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-sm bg-foreground/10 flex-shrink-0" />
          <div className="min-w-0 space-y-1.5 pt-0.5 flex-1">
            <div className="h-3 w-2/3 rounded bg-foreground/10" />
            <div className="h-2.5 w-1/2 rounded bg-foreground/10" />
          </div>
        </div>
        <div className="h-2.5 w-4/5 rounded bg-foreground/10" />
      </div>
    );
  }

  if (!track) return null;

  return (
    <div className="space-y-2 pt-2">
      <Label />

      <a
        href={track.songUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2.5 group/track"
      >
        {track.albumArtUrl && (
          <img
            src={track.albumArtUrl}
            alt={track.album || track.title}
            className="w-10 h-10 rounded-sm object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <span className="min-w-0">
          <span className="block text-foreground truncate group-hover/track:underline">
            {track.title}
          </span>
          <span className="block text-xs text-foreground/60 truncate">
            {track.artists}
          </span>
        </span>
      </a>

      {track.lyricQuote && (
        <p className="text-xs text-foreground/50 normal-case italic leading-relaxed">
          &ldquo;{track.lyricQuote}&rdquo;
        </p>
      )}
    </div>
  );
}
