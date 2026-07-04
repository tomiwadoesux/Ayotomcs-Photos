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

export default function ListeningTo({ rawDate, song, utcTime }) {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const withQuote = (t) => ({ ...t, lyricQuote: pickLyricQuote(t.lyricsSnippet) });

    // A manually tagged song wins over the automatic time lookup
    if (song) {
      fetch(`${MUSIC_API_BASE}/api/spotify/track?q=${encodeURIComponent(song)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.title) setTrack(withQuote(data));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }

    // Server-computed true UTC wins; toIso is only a legacy fallback
    const iso = utcTime || toIso(rawDate);
    if (!iso) return;

    fetch(
      `${MUSIC_API_BASE}/api/spotify/at?time=${encodeURIComponent(iso)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.closest) return;
        if (data.closest.diffMinutes > MAX_DIFF_MINUTES) return;
        setTrack(withQuote(data.closest));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [rawDate, song, utcTime]);

  if (!track) return null;

  return (
    <div className="space-y-2 pt-2">
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
