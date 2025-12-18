import { defineField, defineType } from "sanity";

export default defineType({
  name: "photo",
  title: "Photo",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true,
        metadata: ["exif", "location"],
      },
      description: "Upload your photo here.",
    }),
    defineField({
      name: "location",
      title: "Location Name",
      type: "string",
      description: "e.g. Lisbon, Tokyo",
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "device",
      title: "Device / Camera",
      type: "string",
      description: "e.g. iPhone 16 Pro, Sony ZV-E10",
    }),
    defineField({
      name: "date",
      title: "Date Taken",
      type: "datetime",
    }),

    // EXIF Overrides (Optional - if we want to manually set them instead of extracting)
    defineField({
      name: "exif",
      title: "EXIF Data (Manual Override)",
      type: "object",
      fields: [
        { name: "focalLength", type: "string", title: "Focal Length" },
        {
          name: "focalLength35mm",
          type: "string",
          title: "Focal Length (35mm)",
        },
        { name: "fStop", type: "string", title: "f-Stop" },
        { name: "shutterSpeed", type: "string", title: "Shutter Speed" },
        { name: "iso", type: "string", title: "ISO" },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "image",
    },
  },
});
