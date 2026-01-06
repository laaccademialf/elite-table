import { useEffect, useState } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/categories';

export default function CategoryManager({ onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
      await updateCategory(editingId, { name, description });
    } else {
      await addCategory({ name, description });
    }
    setName('');
    setDescription('');
    setEditingId(null);
    await loadCategories();
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description);
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
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Назва категорії"
          value={name}
          onChange={e => setName(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl flex-1"
          required
        />
        <input
          type="text"
          placeholder="Опис (необов'язково)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl flex-1"
        />
        <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">
          {editingId ? 'Зберегти' : 'Додати'}
        </button>
      </form>
      {loading ? <p>Завантаження...</p> : (
        <ul className="space-y-2">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center gap-2">
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
