import { client, urlFor } from "@/sanity/lib/client";
import { redirect } from "next/navigation";

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
  redirect(`/#${slug}`);
}
