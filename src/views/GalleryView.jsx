import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { getGalleryItems } from '../services/gallery';

export const GalleryView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await getGalleryItems();
        setItems(data);
      } catch (error) {
        console.error('Error loading gallery:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 pt-0 pb-8 md:pb-10 animate-in fade-in duration-700">
      <section className="w-screen relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#081226] via-[#112248] to-[#081226] text-white px-6 pt-3 pb-5 md:pt-4 md:pb-6 mb-8 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 text-xs font-bold uppercase tracking-[0.2em] mb-3">
            <Sparkles size={14} />
            Gallery
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">LaFamiglia Moments</h1>
          <p className="text-slate-300 max-w-2xl text-sm md:text-base leading-relaxed">
            Натхнення для вашої події: красиві сервірування, декор і атмосфера, які допоможуть уявити майбутнє свято ще до бронювання.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-72 rounded-[28px] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Галерея наповнюється</h2>
          <p className="text-slate-600">Незабаром тут зʼявляться найкрасивіші фото для натхнення.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-[220px]">
          {items.map((item, index) => {
            const featuredTile = item.featured || index % 7 === 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`group relative overflow-hidden rounded-[28px] bg-slate-900 shadow-lg text-left ${featuredTile ? 'sm:col-span-2 xl:row-span-2 xl:min-h-[460px]' : ''}`}
              >
                <SafeImage
                  src={item.imageUrl}
                  alt={item.title || 'LaFamiglia gallery image'}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <h3 className="text-white font-black text-lg md:text-xl uppercase leading-tight drop-shadow">
                    {item.title || 'LaFamiglia Rentco'}
                  </h3>
                  {item.description ? (
                    <p className="text-slate-200 text-sm mt-2 line-clamp-2 max-w-xl">{item.description}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="relative max-w-5xl w-full rounded-[28px] overflow-hidden bg-slate-950 border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
            <SafeImage src={selectedItem.imageUrl} alt={selectedItem.title || 'Gallery image'} className="w-full max-h-[78vh] object-cover" />
            <div className="p-5 md:p-6 bg-slate-950 text-white">
              <h3 className="text-2xl font-black uppercase">{selectedItem.title || 'LaFamiglia Rentco'}</h3>
              {selectedItem.description ? <p className="text-slate-300 mt-2">{selectedItem.description}</p> : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
