import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import { addGalleryItem, deleteGalleryItem, getGalleryItems, updateGalleryItem, uploadGalleryImage } from '../services/gallery';

export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [featured, setFeatured] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resolvedPreview = useMemo(() => previewUrl || imageUrl, [previewUrl, imageUrl]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const data = await getGalleryItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError('Не вдалося завантажити галерею');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setFeatured(true);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const flashMessage = (text, isError = false) => {
    if (isError) {
      setError(text);
      setMessage('');
    } else {
      setMessage(text);
      setError('');
    }

    window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 2600);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile && !imageUrl.trim()) {
      flashMessage('Додайте файл або вставте URL фото', true);
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl.trim();
      if (selectedFile) {
        finalImageUrl = await uploadGalleryImage(selectedFile);
      }

      await addGalleryItem({
        title: title.trim(),
        description: description.trim(),
        imageUrl: finalImageUrl,
        featured,
      });

      resetForm();
      flashMessage('Фото додано в галерею');
      await loadGallery();
    } catch (err) {
      console.error(err);
      flashMessage(err.message || 'Помилка при завантаженні фото', true);
    } finally {
      setLoading(false);
    }
  };

  const moveItem = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];

    setLoading(true);
    try {
      await Promise.all([
        updateGalleryItem(current.id, { order: target.order ?? targetIndex + 1 }),
        updateGalleryItem(target.id, { order: current.order ?? index + 1 }),
      ]);
      await loadGallery();
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (item) => {
    setLoading(true);
    try {
      await updateGalleryItem(item.id, { featured: !item.featured });
      await loadGallery();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити фото з галереї?')) return;

    setLoading(true);
    try {
      await deleteGalleryItem(id);
      await loadGallery();
      flashMessage('Фото видалено');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-slate-900">Керування галереєю</h3>
          <p className="text-slate-600 text-sm mt-1">
            Додавайте атмосферні фото для клієнтів — вони зʼявляться у вкладці `Галерея` вгорі сайту.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Назва фото або сету"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-slate-900 font-semibold"
            />
            <textarea
              placeholder="Короткий опис або настрій фото"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-slate-900"
            />
            <input
              type="url"
              placeholder="Або вставте URL зображення"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-slate-900"
            />
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 cursor-pointer transition text-slate-700 font-semibold">
              <Upload size={18} />
              <span>{selectedFile ? selectedFile.name : 'Завантажити файл з компʼютера'}</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-slate-300"
              />
              Показувати у пріоритеті в галереї
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between min-h-[280px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 mb-3">Preview</p>
              {resolvedPreview ? (
                <img src={resolvedPreview} alt="Preview" className="w-full h-56 object-cover rounded-2xl shadow-sm" />
              ) : (
                <div className="w-full h-56 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white">
                  <div className="text-center">
                    <ImagePlus className="mx-auto mb-2" size={28} />
                    <div className="text-sm">Тут буде прев’ю фото</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {error ? <div className="text-sm text-red-600 font-medium">{error}</div> : null}
              {message ? <div className="text-sm text-green-600 font-medium">{message}</div> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {loading ? 'Завантаження...' : 'Додати в галерею'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Фото в галереї</h3>
            <p className="text-slate-500 text-sm">Порядок можна змінювати стрілками, а найкращі фото — відмічати як пріоритетні.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">{items.length} фото</span>
        </div>

        {loading && items.length === 0 ? (
          <p className="text-slate-600">Завантаження...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">Поки що фото не додано.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                <img src={item.imageUrl} alt={item.title || 'Gallery'} className="w-full h-48 object-cover" />
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900">{item.title || 'Без назви'}</h4>
                      {item.featured ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">featured</span>
                      ) : null}
                    </div>
                    {item.description ? <p className="text-sm text-slate-600 mt-1">{item.description}</p> : null}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => moveItem(index, -1)} className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700" title="Вгору">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" onClick={() => moveItem(index, 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700" title="Вниз">
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" onClick={() => toggleFeatured(item)} className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700 font-semibold inline-flex items-center gap-2">
                      <Star size={14} />
                      {item.featured ? 'Зняти акцент' : 'В акцент'}
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold inline-flex items-center gap-2 ml-auto">
                      <Trash2 size={14} />
                      Видалити
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
