// Purely presentational: the track (including the chosen lyric line) is
// resolved on the server and passed in, so there's no client fetch, no loading
// skeleton, and no per-photo network request on page load.

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

export default function ListeningTo({ track }) {
  if (!track) return null;

  const lyricQuote = track.lyricQuote;

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

      {lyricQuote && (
        <p className="text-xs text-foreground/50 normal-case italic leading-relaxed">
          &ldquo;{lyricQuote}&rdquo;
        </p>
      )}
    </div>
  );
}
