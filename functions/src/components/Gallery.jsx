import { useState } from "react";

export default function Gallery({ gallery = {}, onUpload }) {
  const [selected, setSelected] = useState(null);
  const items = Object.values(gallery || {})
  .flatMap(item => {
    if (Array.isArray(item)) return item;
    if (item && typeof item === "object" && item.url) return [item];
    if (item && typeof item === "object") return Object.values(item);
    return [];
  })
  .filter(item => item && item.url)
  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  function mediaUrl(item) {
  return item.url || item.src || item.image || item.photo || item.href || "";
}

  return (
    <section className="galleryPage">
      <div className="sectionHead">
        <div>
          <h2>Galleri</h2>
          <span>Bilder och videos från Volvo Masters</span>
        </div>

        <label className="uploadButton">
          📷 Lägg till bild/video
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length === 0 ? (
        <div className="emptyGallery">
          <h3>Inga bilder ännu</h3>
          <p>Lägg upp första bilden från tävlingen.</p>
        </div>
      ) : (
        <div className="galleryGrid">
          {items.map((item) => (
            <button
              className="galleryItem"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              {item.type?.startsWith("video") ? (
                <video src={item.url} muted playsInline />
              ) : (
                <img src={mediaUrl(item)} alt={item.name || "Galleri"} />
              )}
              <span>{item.name || "Volvo Masters"}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <button className="lightboxClose">×</button>

          <div className="lightboxInner" onClick={(e) => e.stopPropagation()}>
            {selected.type?.startsWith("video") ? (
              <video src={selected.url} controls autoPlay />
            ) : (
              <img src={selected.url} alt={selected.name || "Galleri"} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}