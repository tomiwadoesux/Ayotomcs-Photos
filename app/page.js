import { client, urlFor } from "@/sanity/lib/client";
import Header from "./components/Header";
import PhotoStage from "./components/PhotoStage";
import ExifReader from "exifreader";

export const revalidate = 60; // Revalidate every 60 seconds

// Timezone the camera clock is assumed to be in when the photo has no
// explicit EXIF offset. Used only for the music lookup, not for display.
const PHOTO_TZ = process.env.NEXT_PUBLIC_PHOTO_TZ || "America/New_York";

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
          // Default on: only an explicit false hides the music block
          showMusic: rawPhoto.showMusic !== false,
          date: formattedDate,
          rawDate: rawDate,
          // True UTC instant for the music lookup. A manually set Studio date
          // is already real UTC; EXIF wall-clock times need conversion.
          musicTime: rawPhoto.date
            ? new Date(rawPhoto.date).toISOString()
            : rawDate
              ? utcFromWallTime(rawDate, exifOffset, PHOTO_TZ)
              : null,
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
  ).filter(Boolean);

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
