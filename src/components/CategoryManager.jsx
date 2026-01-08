import { useEffect, useState } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/categories';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function CategoryManager({ onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    setLoading(false);
    if (onCategoryChange) onCategoryChange(cats);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Введіть назву категорії');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name, description, icon });
        setSuccess('Категорію оновлено!');
      } else {
        await addCategory({ name, description, icon });
        setSuccess('Категорію додано!');
      }
      setName('');
      setDescription('');
      setIcon('');
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      setError('Помилка при збереженні категорії');
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(''); setError(''); }, 2000);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description);
    setIcon(cat.icon || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити категорію?')) return;
    setLoading(true);
    await deleteCategory(id);
    await loadCategories();
  };

  const moveCategory = async (index, direction) => {
    // direction: -1 up, +1 down
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const current = categories[index];
    const target = categories[targetIndex];

    // Призначаємо fallback order, якщо його немає
    const currentOrder = current.order ?? index + 1;
    const targetOrder = target.order ?? targetIndex + 1;

    setLoading(true);
    try {
      await Promise.all([
        updateCategory(current.id, { ...current, order: targetOrder }),
        updateCategory(target.id, { ...target, order: currentOrder }),
      ]);
      await loadCategories();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
      <h3 className="text-xl font-bold mb-4">Категорії товарів</h3>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 mb-4">
        {error && <div className="text-red-600 font-medium mb-2 w-full">{error}</div>}
        {success && <div className="text-green-600 font-medium mb-2 w-full">{success}</div>}
        <input
          type="text"
          placeholder="Назва категорії"
          value={name}
          onChange={e => setName(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold flex-1"
          required
        />
        <input
          type="text"
          placeholder="Опис (необов'язково)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 flex-1"
        />
        <div className="flex-1">
          <input
            type="url"
            placeholder="URL зображення категорії"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 w-full"
            autoComplete="off"
          />
          {icon && (
            <div className="mt-2">
              <img 
                src={icon} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-xl border border-slate-200" 
                onError={(e) => e.target.style.display = 'none'} 
              />
            </div>
          )}
        </div>
        <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition min-w-[120px]">
          {editingId ? 'Зберегти' : 'Додати'}
        </button>
      </form>
      {loading ? <p>Завантаження...</p> : (
        <ul className="space-y-2">
          {categories.map((cat, idx) => (
            <li key={cat.id} className="flex items-center gap-3">
              {cat.icon && (
                <img 
                  src={cat.icon} 
                  alt={cat.name} 
                  className="w-12 h-12 object-cover rounded-xl border border-slate-200" 
                  onError={(e) => e.target.style.display = 'none'} 
                />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900">{cat.name}</span>
                <span className="text-slate-500 text-sm">{cat.description}</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => moveCategory(idx, -1)}
                  disabled={idx === 0 || loading}
                  className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  title="Вгору"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveCategory(idx, 1)}
                  disabled={idx === categories.length - 1 || loading}
                  className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  title="Вниз"
                >
                  <ArrowDown size={16} />
                </button>
                <button onClick={() => handleEdit(cat)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold">Редагувати</button>
                <button onClick={() => handleDelete(cat.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold">Видалити</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
