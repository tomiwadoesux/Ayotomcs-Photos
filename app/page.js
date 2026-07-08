import { client, urlFor } from "@/sanity/lib/client";
import Header from "./components/Header";
import PhotoStage from "./components/PhotoStage";
import ExifReader from "exifreader";

export const revalidate = 60; // Revalidate every 60 seconds

// Timezone the camera clock is assumed to be in when the photo has no
// explicit EXIF offset. Used only for the music lookup, not for display.
const PHOTO_TZ = process.env.NEXT_PUBLIC_PHOTO_TZ || "America/New_York";

// Where the Spotify/lyrics API lives.
const MUSIC_API_BASE =
  process.env.NEXT_PUBLIC_MUSIC_API_BASE || "https://ayotomcs.me";
// Only attach a track if it was played within this window of the photo time.
const MAX_DIFF_MINUTES = 180;

// Pick a quotable lyric line, skipping filler ("Yeah", "Mmm", ad-libs).
function pickLyricQuote(lines) {
  if (!lines || lines.length === 0) return null;
  const quotable = lines.filter(
    (line) => line.length >= 12 && !/^[([]/.test(line),
  );
  const pool = quotable.length > 0 ? quotable : lines;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Resolve "what was playing" on the SERVER so it's fetched once per
// revalidation window and shared across all visitors — instead of every
// browser firing one request per photo on every page load. A photo's music is
// historical and immutable, so it can be cached well past the page's own
// revalidate window.
async function resolveTrack({ song, musicTime }) {
  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, { next: { revalidate: 86400 } });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  const withQuote = (t) =>
    t ? { ...t, lyricQuote: pickLyricQuote(t.lyricsSnippet) } : null;

  // A manually tagged song wins over the automatic time lookup.
  if (song) {
    const data = await fetchJson(
      `${MUSIC_API_BASE}/api/spotify/track?q=${encodeURIComponent(song)}`,
    );
    return withQuote(data?.title ? data : null);
  }

  if (musicTime) {
    const data = await fetchJson(
      `${MUSIC_API_BASE}/api/spotify/at?time=${encodeURIComponent(musicTime)}`,
    );
    const c = data?.closest;
    return withQuote(c && c.diffMinutes <= MAX_DIFF_MINUTES ? c : null);
  }

  return null;
}

// Best-effort real timestamp (ms) for a value that may be a zoned ISO string,
// a bare wall-clock string, or missing. Used to sort the feed by taken-date.
function toMs(value) {
  if (!value) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const d = new Date(hasZone ? value : `${value}Z`);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// EXIF datetimes are the camera's wall clock with no timezone (Sanity fakes a
// trailing Z). Convert a wall-clock time to the real UTC instant so the
// what-was-playing lookup lines up with the Spotify play log.
function utcFromWallTime(wallClock, explicitOffset, timeZone) {
  try {
    const wallIso = String(wallClock).replace(
      /(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/,
      "",
    );
    if (explicitOffset) {
      const d = new Date(`${wallIso}${explicitOffset}`);
      return isNaN(d) ? null : d.toISOString();
    }
    const wall = new Date(`${wallIso}Z`);
    if (isNaN(wall)) return null;
    // Two passes converge on the UTC instant whose wall time in `timeZone`
    // matches, handling DST correctly for the photo's own date
    let utc = wall;
    for (let i = 0; i < 2; i++) {
      const utcRender = new Date(
        utc.toLocaleString("en-US", { timeZone: "UTC" }),
      );
      const tzRender = new Date(utc.toLocaleString("en-US", { timeZone }));
      utc = new Date(
        wall.getTime() + (utcRender.getTime() - tzRender.getTime()),
      );
    }
    return utc.toISOString();
  } catch {
    return null;
  }
}

async function getPhotos() {
  const query = `*[_type == "photo"] | order(coalesce(date, _createdAt) desc) {
    _id,
    _createdAt,
    title,
    slug,
    location,
    date,
    device,
    tags,
    song,
    showMusic,
    image {
      asset-> {
        _id,
        url,
        metadata {
          exif,
          dimensions
        }
      }
    }
  }`;
  return await client.fetch(query);
}

export default async function Home() {
  const photos = await getPhotos();

  // 1. Calculate Stats
  const stats = {
    totalCount: photos.length,
    tags: {},
    cameras: {},
    locations: {},
  };

  photos.forEach((photo) => {
    // Count Tags
    if (photo.tags) {
      photo.tags.forEach((tag) => {
        const key = tag.toLowerCase().trim();
        if (!stats.tags[key]) {
          stats.tags[key] = { count: 0, label: tag };
        }
        stats.tags[key].count += 1;
      });
    }
    // Count Cameras
    const deviceName =
      photo.device ||
      photo.image?.asset?.metadata?.exif?.Model ||
      "Unknown Camera";
    if (deviceName && deviceName !== "Unknown Camera") {
      const key = deviceName.toLowerCase().trim();
      if (!stats.cameras[key]) {
        stats.cameras[key] = { count: 0, label: deviceName };
      }
      stats.cameras[key].count += 1;
    }
    // Count Locations
    if (photo.location) {
      const key = photo.location.toLowerCase().trim();
      if (!stats.locations[key]) {
        stats.locations[key] = { count: 0, label: photo.location };
      }
      stats.locations[key].count += 1;
    }
  });

  const formattedStats = {
    totalCount: stats.totalCount,
    tags: Object.values(stats.tags).sort((a, b) => b.count - a.count),
    cameras: Object.values(stats.cameras).sort((a, b) => b.count - a.count),
    locations: Object.values(stats.locations).sort((a, b) => b.count - a.count),
  };

  // 2. Format Photos for Feed (with heavy fallback for dates)
  const feed = (
    await Promise.all(
      photos.map(async (rawPhoto) => {
        const asset = rawPhoto.image?.asset;
        if (!asset) return null;

        let formattedDate = "";
        let rawDate = rawPhoto.date;
        let exifOffset = null; // e.g. "-04:00" when the camera recorded it
        const sanityExif = rawPhoto.image?.asset?.metadata?.exif;
        if (sanityExif?.OffsetTimeOriginal) {
          exifOffset = sanityExif.OffsetTimeOriginal;
        }

        // 1. Try Sanity EXIF
        if (!rawDate && sanityExif) {
          const exifDate = sanityExif.DateTimeOriginal || sanityExif.CreateDate;
          if (exifDate) {
            if (exifDate.includes(" ")) {
              const [d, t] = exifDate.split(" ");
              rawDate = `${d.replace(/:/g, "-")}T${t}`;
            } else {
              rawDate = exifDate;
            }
          }
        }

        // 2. Deep Fallback: ExifReader
        if (!rawDate && asset.url) {
          try {
            const res = await fetch(asset.url);
            const arrayBuffer = await res.arrayBuffer();
            const tags = ExifReader.load(arrayBuffer);

            const tagDate =
              tags["DateTimeOriginal"]?.description ||
              tags["CreateDate"]?.description;
            if (tagDate) {
              const [d, t] = tagDate.split(" ");
              rawDate = `${d.replace(/:/g, "-")}T${t}`;
            }

            if (!exifOffset && tags["OffsetTimeOriginal"]?.description) {
              exifOffset = tags["OffsetTimeOriginal"].description;
            }

            if (
              !rawPhoto.device &&
              !sanityExif?.Model &&
              tags["Model"]?.description
            ) {
              rawPhoto.deviceFallback = tags["Model"].description;
            }
          } catch (e) {}
        }

        if (rawDate) {
          try {
            formattedDate = new Date(rawDate)
              .toLocaleString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
                timeZone: "UTC",
              })
              .toUpperCase();
          } catch (e) {}
        }

        const dimensions = rawPhoto.image?.asset?.metadata?.dimensions;

        // Default on: only an explicit false hides the music block
        const showMusic = rawPhoto.showMusic !== false;

        // True UTC instant for the music lookup. A manually set Studio date
        // is already real UTC; EXIF wall-clock times need conversion.
        const musicTime = rawPhoto.date
          ? new Date(rawPhoto.date).toISOString()
          : rawDate
            ? utcFromWallTime(rawDate, exifOffset, PHOTO_TZ)
            : null;

        // Resolve the track on the server (cached) so the browser doesn't have
        // to fetch it on every load.
        const track = showMusic
          ? await resolveTrack({ song: rawPhoto.song, musicTime })
          : null;

        // Sort by when the photo was actually TAKEN (not when it was uploaded),
        // so posting an old photo drops it into its correct chronological spot.
        const sortMs =
          toMs(musicTime) ?? toMs(rawDate) ?? toMs(rawPhoto._createdAt) ?? 0;

        return {
          id: rawPhoto._id,
          slug: rawPhoto.slug?.current || rawPhoto._id,
          src: urlFor(rawPhoto.image).width(2000).auto("format").url(),
          title: rawPhoto.title,
          location: rawPhoto.location,
          device:
            rawPhoto.device ||
            rawPhoto.deviceFallback ||
            sanityExif?.Model ||
            "Unknown Camera",
          tags: rawPhoto.tags,
          song: rawPhoto.song,
          showMusic,
          date: formattedDate,
          rawDate: rawDate,
          musicTime,
          track,
          sortMs,
          width: dimensions?.width,
          height: dimensions?.height,
          aspectRatio: dimensions?.aspectRatio,
          exif: sanityExif || {
            focalLength: null,
            FNumber: null,
            ExposureTime: null,
            ISO: null,
          },
        };
      }),
    )
  )
    .filter(Boolean)
    // Newest taken-date at the top, earliest at the bottom.
    .sort((a, b) => b.sortMs - a.sortMs);

  return (
    <div className="min-h-screen flex flex-col">
      <Header stats={formattedStats} photos={feed} />
      {feed.length > 0 ? (
        <div className="flex flex-col">
          {feed.map((photo) => (
            <PhotoStage key={photo.id} photo={photo} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-neutral-500 font-mono text-sm">
          NO PHOTOS FOUND
        </div>
      )}
    </div>
  );
}
