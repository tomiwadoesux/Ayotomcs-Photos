import Image from "next/image";

export default function PhotoStage({ photo }) {
  if (!photo) return null;

  return (
    <div id={photo.id} className="flex flex-col pt-18 md:pt-7 w-full h-full ">
      {/* Top Divider */}
      <div className="w-full pb-4 md:pb-12 px-6">
        <svg
          className="w-full h-px text-neutral-500"
          viewBox="0 0 100 1"
          preserveAspectRatio="none"
        >
          <path
            d="M0 0H100"
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="flex flex-col md:flex-row-reverse flex-1">
        {/* Left: Image */}
        <div className=" flex-2 lg:flex-1 w-full  md:pt-0 p-4 md:p-6 flex items-start justify-center">
          <div className="relative w-full bg-neutral-900 rounded-sm">
            <Image
              src={photo.src}
              width={photo.width || 800}
              height={photo.height || 1000}
              alt={photo.title || "Photo"}
              className="w-full h-auto object-contain"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority={false}
            />
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="flex-1 w-full p-6 flex flex-col justify-end gap-8 text-foreground font-mono text-sm uppercase tracking-wide">
          {/* Metadata Top Divider */}
          <div className="w-full pb-">
            <svg
              className="w-full h-px text-neutral-700"
              viewBox="0 0 100 1"
              preserveAspectRatio="none"
            >
              <path
                d="M0 0H100"
                stroke="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-bold text-lg">{photo.title}</h2>
                <p className="text-foreground/70">{photo.location}</p>
              </div>

              <div className="space-y-2">
                {/* Camera / Device */}
                <div className="flex items-center gap-2 text-foreground/70">
                  {photo.device &&
                  photo.device.toLowerCase().includes("iphone") ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 text-foreground"
                    >
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 text-foreground"
                    >
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path
                        fillRule="evenodd"
                        d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span>{photo.device}</span>
                </div>

                {/* Tags */}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {photo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-foreground/60 border border-foreground/20 px-1.5 py-0.5 rounded-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 text-foreground/70">
              {photo.exif && (
                <div className="space-y-1">
                  <p className="space-x-2">
                    <span className="text-foreground">
                      {/* Try automatic FocalLength (e.g. 5.10) or manual, append mm */}
                      {photo.exif.FocalLength
                        ? `${Math.round(photo.exif.FocalLength)}mm`
                        : photo.exif.focalLength || "--"}
                    </span>{" "}
                    {photo.exif.FocalLengthIn35mmFormat && (
                      <span className="line-through decoration-neutral-600">
                        {photo.exif.FocalLengthIn35mmFormat}mm
                      </span>
                    )}
                  </p>
                  <p>
                    {photo.exif.FNumber
                      ? `f/${photo.exif.FNumber}`
                      : photo.exif.fStop || "--"}
                  </p>
                  <p>
                    {photo.exif.ExposureTime
                      ? `1/${Math.round(1 / photo.exif.ExposureTime)}s`
                      : photo.exif.shutterSpeed || "--"}
                  </p>
                  <p>ISO {photo.exif.ISO || photo.exif.iso || "--"}</p>
                  <p>0ev</p>
                  <p className="pt-5">{photo.date}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
