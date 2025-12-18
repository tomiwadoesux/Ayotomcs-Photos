import { client, urlFor } from "@/sanity/lib/client";
import Header from "./components/Header";
import PhotoStage from "./components/PhotoStage";
import ExifReader from "exifreader";

export const revalidate = 60; // Revalidate every 60 seconds

async function getPhotos() {
  const query = `*[_type == "photo"] | order(coalesce(date, _createdAt) desc) {
    _id,
    title,
    location,
    date,
    device,
    tags,
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
        const label = tag.toUpperCase();
        stats.tags[label] = (stats.tags[label] || 0) + 1;
      });
    }
    // Count Cameras
    const deviceName =
      photo.device ||
      photo.image?.asset?.metadata?.exif?.Model ||
      "Unknown Camera";
    if (deviceName && deviceName !== "Unknown Camera") {
      const device = deviceName.toUpperCase();
      stats.cameras[device] = (stats.cameras[device] || 0) + 1;
    }
    // Count Locations
    if (photo.location) {
      const loc = photo.location.toUpperCase();
      stats.locations[loc] = (stats.locations[loc] || 0) + 1;
    }
  });

  const formattedStats = {
    totalCount: stats.totalCount,
    tags: Object.entries(stats.tags)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    cameras: Object.entries(stats.cameras)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    locations: Object.entries(stats.locations)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };

  // 2. Format Photos for Feed (with heavy fallback for dates)
  const feed = (
    await Promise.all(
      photos.map(async (rawPhoto) => {
        const asset = rawPhoto.image?.asset;
        if (!asset) return null;

        let formattedDate = "";
        let rawDate = rawPhoto.date;
        const sanityExif = rawPhoto.image?.asset?.metadata?.exif;

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
          src: urlFor(rawPhoto.image).width(2000).auto("format").url(),
          title: rawPhoto.title,
          location: rawPhoto.location,
          device:
            rawPhoto.device ||
            rawPhoto.deviceFallback ||
            sanityExif?.Model ||
            "Unknown Camera",
          tags: rawPhoto.tags,
          date: formattedDate,
          rawDate: rawDate,
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
      })
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
