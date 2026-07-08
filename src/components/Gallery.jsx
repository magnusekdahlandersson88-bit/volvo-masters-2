import { useState } from "react";

export default function Gallery({ gallery = {}, onUpload }) {
  const [selected, setSelected] = useState(null);
  const items = Object.values(gallery || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>

      <div className="galleryGrid">
        {items.map((item) => (
          <button className="galleryItem" key={item.id} onClick={() => setSelected(item)}>
            {item.type?.startsWith("video") ? (
              <video src={item.url} />
            ) : (
              <img src={item.url} alt="" />
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <button className="lightboxClose">×</button>
          {selected.type?.startsWith("video") ? (
            <video src={selected.url} controls autoPlay />
          ) : (
            <img src={selected.url} alt="" />
          )}
        </div>
      )}
    </section>
  );
}