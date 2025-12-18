"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const HoverItem = ({ children, onClick, onMouseEnter, isActive }) => {
  const itemRef = useRef(null);
  const bgRef = useRef(null);

  const handleMouseEnter = (e) => {
    onMouseEnter && onMouseEnter();

    const { top, height } = e.currentTarget.getBoundingClientRect();
    const isEnterFromTop = e.clientY - top < height / 2;

    gsap.killTweensOf(bgRef.current);
    gsap.fromTo(
      bgRef.current,
      { y: isEnterFromTop ? "-100%" : "100%" },
      { y: "0%", duration: 0.25, ease: "power3.out" }
    );
  };

  const handleMouseLeave = (e) => {
    const { top, height } = e.currentTarget.getBoundingClientRect();
    const isExitToTop = e.clientY - top < height / 2;

    gsap.to(bgRef.current, {
      y: isExitToTop ? "-100%" : "100%",
      duration: 0.25,
      ease: "power3.in",
    });
  };

  return (
    <li
      ref={itemRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-md cursor-pointer group ${isActive ? "text-foreground font-bold" : "text-neutral-400"}`}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 bg-foreground"
        style={{ transform: "translateY(100%)" }}
      />
      <div
        className={`relative z-10 px-2 py-1.5 flex justify-between items-center `}
      >
        {children}
      </div>
    </li>
  );
};

export default function SearchModal({ onClose, stats, photos = [] }) {
  const [query, setQuery] = useState("");
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const filteredStats = useMemo(() => {
    if (!stats) return {};
    const q = query.toLowerCase();
    return {
      tags: stats.tags?.filter((t) => t.label.toLowerCase().includes(q)),
      cameras: stats.cameras?.filter((c) => c.label.toLowerCase().includes(q)),
      locations: stats.locations?.filter((l) =>
        l.label.toLowerCase().includes(q)
      ),
    };
  }, [stats, query]);

  const displayPhotos = useMemo(() => {
    if (!photos) return [];
    let matches = [];

    if (activeItem) {
      const label = activeItem.label.toUpperCase();
      if (activeItem.type === "tag") {
        matches = photos.filter((p) =>
          p.tags?.some((t) => t.toUpperCase() === label)
        );
      } else if (activeItem.type === "camera") {
        matches = photos.filter(
          (p) => p.device && p.device.toUpperCase() === label
        );
      } else if (activeItem.type === "location") {
        matches = photos.filter(
          (p) => p.location && p.location.toUpperCase() === label
        );
      }
    } else if (query) {
      matches = [];
    }

    return matches;
  }, [photos, activeItem, query]);

  const dateRange = useMemo(() => {
    if (displayPhotos.length === 0) return null;
    const dates = displayPhotos
      .map((p) => (p.rawDate ? new Date(p.rawDate) : null))
      .filter(Boolean)
      .sort((a, b) => b - a);

    if (dates.length === 0) return null;

    const newest = dates[0];
    const oldest = dates[dates.length - 1];

    const fmt = (d) =>
      d
        .toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        .toUpperCase();

    if (dates.length === 1) return fmt(newest);
    return `${fmt(newest)} - ${fmt(oldest)}`;
  }, [displayPhotos]);

  const handlePhotoClick = (id) => {
    onClose();
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-background rounded-xl border border-foreground/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground font-mono text-sm flex flex-col md:flex-row h-[85vh]">
        {/* LEFT COLUMN */}
        <div className="w-full md:w-1/3 md:min-w-[300px] h-[45%] md:h-full border-b md:border-b-0 md:border-r border-foreground/10 flex flex-col bg-background">
          <div className="p-4 border-b border-foreground/10 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent outline-none placeholder:text-neutral-500 text-foreground"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!stats ? (
              <div className="text-neutral-500">Loading...</div>
            ) : (
              <>
                {filteredStats.tags?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-neutral-500 text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                      Tags
                    </p>
                    <ul className="space-y-1">
                      {filteredStats.tags.map((item) => (
                        <HoverItem
                          key={item.label}
                          isActive={false}
                          onMouseEnter={() =>
                            setActiveItem({ type: "tag", label: item.label })
                          }
                          onClick={() =>
                            setActiveItem({ type: "tag", label: item.label })
                          }
                        >
                          <span>{item.label}</span>
                          <span className="text-xs opacity-50">
                            × {item.count}
                          </span>
                        </HoverItem>
                      ))}
                    </ul>
                  </div>
                )}

                {filteredStats.cameras?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-neutral-500 text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                      Cameras
                    </p>
                    <ul className="space-y-1">
                      {filteredStats.cameras.map((item) => (
                        <HoverItem
                          key={item.label}
                          isActive={false}
                          onMouseEnter={() =>
                            setActiveItem({ type: "camera", label: item.label })
                          }
                          onClick={() =>
                            setActiveItem({ type: "camera", label: item.label })
                          }
                        >
                          <span>{item.label}</span>
                          <span className="text-xs opacity-50">
                            × {item.count}
                          </span>
                        </HoverItem>
                      ))}
                    </ul>
                  </div>
                )}

                {filteredStats.locations?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-neutral-500 text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                      Locations
                    </p>
                    <ul className="space-y-1">
                      {filteredStats.locations.map((item) => (
                        <HoverItem
                          key={item.label}
                          isActive={false}
                          onMouseEnter={() =>
                            setActiveItem({
                              type: "location",
                              label: item.label,
                            })
                          }
                          onClick={() =>
                            setActiveItem({
                              type: "location",
                              label: item.label,
                            })
                          }
                        >
                          <span>{item.label}</span>
                          <span className="text-xs opacity-50">
                            × {item.count}
                          </span>
                        </HoverItem>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full md:flex-1 h-[55%] md:h-full bg-background md:border-l border-foreground/10 p-6 flex flex-col overflow-hidden">
          {activeItem ? (
            <>
              <div className="flex justify-between items-baseline border-b border-foreground/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{activeItem.label}</h2>
                </div>
                <div className="text-neutral-500 text-xs text-right space-y-1">
                  <div>{displayPhotos.length} PHOTOS</div>
                  {dateRange && <div>{dateRange}</div>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {displayPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => handlePhotoClick(photo.id)}
                      className="aspect-square bg-neutral-900 relative group overflow-hidden cursor-pointer rounded-sm hover:outline hover:outline-2 hover:outline-[#4447a9] transition-all"
                    >
                      <Image
                        src={photo.src}
                        alt={photo.title || "Photo"}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                  {displayPhotos.length === 0 && (
                    <div className="col-span-full py-10 text-center text-neutral-600">
                      No photos found.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4">
              <p>Select a category to view photos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
