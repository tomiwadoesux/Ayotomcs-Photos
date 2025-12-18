export default function PhotoGrid() {
  // Placeholder images for demonstration
  const images = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    src: `https://images.unsplash.com/photo-${
      [
        "1572507386766-3d7589ed9452", // Lisbon
        "1493246507139-91e8fad9978e", // Landscape
        "1517816385568-ea47e4443952", // Architecture
        "1618005182384-a83a8bd57fbe", // Abstract
        "1550525811-e5869dd03032", // Portrait
      ][i % 5]
    }?q=80&w=800&auto=format&fit=crop`,
  }));

  return (
    <div className="w-full h-full p-1 -mt-1">
      <div className="grid grid-cols-5 gap-1">
        {images.map((img) => (
          <div
            key={img.id}
            className="aspect-[4/5] bg-neutral-900 overflow-hidden relative group cursor-pointer"
          >
            <img
              src={img.src}
              alt={`Photo ${img.id}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
}
