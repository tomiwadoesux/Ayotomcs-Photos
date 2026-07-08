import { client, urlFor } from "@/sanity/lib/client";
import PhotoRedirect from "./PhotoRedirect";

export const revalidate = 60;

async function getPhoto(slug) {
  const query = `*[_type == "photo" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    location,
    image {
      asset-> {
        _id,
        url,
        metadata {
          dimensions
        }
      }
    }
  }`;
  return await client.fetch(query, { slug });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const photo = await getPhoto(slug);

  if (!photo) {
    return {
      title: "Photo Not Found | Ayotomcs",
    };
  }

  const ogImageUrl = urlFor(photo.image)
    .width(1200)
    .height(630)
    .fit("crop")
    .auto("format")
    .url();

  const title = photo.title
    ? `${photo.title} | Ayotomcs`
    : "Photos | Ayotomcs";
  const description = photo.location
    ? `Photo taken at ${photo.location}`
    : "A photo by Ayotomiwa";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: photo.title || "Photo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PhotoPage({ params }) {
  const { slug } = await params;
  const photo = await getPhoto(slug);

  // Full-size image for the brief moment before a real visitor is redirected,
  // and for any crawler that scrapes the page's images directly.
  const imageUrl = photo?.image
    ? urlFor(photo.image).width(1600).auto("format").url()
    : null;

  // IMPORTANT: don't server-redirect here.
  //
  // A server-side redirect() returns an HTTP 307 with no HTML body, so the
  // per-photo Open Graph tags built in generateMetadata never reach social
  // crawlers (Slack, iMessage, X/Twitter, WhatsApp, Facebook, ...). They'd
  // follow the redirect to "/" and read the generic site preview instead.
  //
  // Rendering real HTML lets crawlers read this page's photo-specific OG tags,
  // while PhotoRedirect (client-side, JS only) sends real visitors to the
  // gallery scrolled to this photo. Crawlers don't run JS, so they stay put.
  return (
    <main
      style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={photo.title || "Photo"}
          style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain" }}
        />
      )}
      <PhotoRedirect slug={slug} />
    </main>
  );
}
