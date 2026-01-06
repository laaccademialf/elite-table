import { useEffect, useState } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/categories';

export default function CategoryManager({ onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    if (editingId) {
      await updateCategory(editingId, { name, description, icon });
    } else {
      await addCategory({ name, description, icon });
    }
    setName('');
    setDescription('');
    setIcon('');
    setEditingId(null);
    await loadCategories();
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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
      <h3 className="text-xl font-bold mb-4">Категорії товарів</h3>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 mb-4">
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
        <input
          type="text"
          placeholder="Іконка (emoji або клас)"
          value={icon}
          onChange={e => setIcon(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 flex-1"
        />
        <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition min-w-[120px]">
          {editingId ? 'Зберегти' : 'Додати'}
        </button>
      </form>
      {loading ? <p>Завантаження...</p> : (
        <ul className="space-y-2">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center gap-3">
              {cat.icon && <span className="text-2xl mr-1">{cat.icon}</span>}
              <span className="font-semibold text-slate-900">{cat.name}</span>
              <span className="text-slate-500 text-sm">{cat.description}</span>
              <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:underline ml-2">Редагувати</button>
              <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Видалити</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
