import { useEffect, useMemo, useState } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/categories';
import { ArrowUp, ArrowDown, CornerDownRight } from 'lucide-react';

export default function CategoryManager({ onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState('');
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

  const rootCategories = useMemo(
    () => categories.filter((cat) => !cat.parentId),
    [categories]
  );

  const groupedCategories = useMemo(() => {
    const roots = categories.filter((cat) => !cat.parentId);
    const groups = roots.map((parent) => ({
      parent,
      children: categories.filter((cat) => cat.parentId === parent.id),
    }));

    const orphanChildren = categories.filter(
      (cat) => cat.parentId && !categories.some((parent) => parent.id === cat.parentId)
    );

    if (orphanChildren.length > 0) {
      groups.push({
        parent: { id: 'orphans', name: 'Без батьківської категорії', description: '', icon: '', isVirtual: true },
        children: orphanChildren,
      });
    }

    return groups;
  }, [categories]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('');
    setParentId('');
    setEditingId(null);
  };

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
      const payload = {
        name: name.trim(),
        description,
        icon,
        parentId: parentId || null,
      };

      if (editingId) {
        await updateCategory(editingId, payload);
        setSuccess('Категорію оновлено!');
      } else {
        await addCategory(payload);
        setSuccess('Категорію додано!');
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      console.error(err);
      setError('Помилка при збереженні категорії');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 2000);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIcon(cat.icon || '');
    setParentId(cat.parentId || '');
  };

  const handleDelete = async (id) => {
    const hasChildren = categories.some((cat) => cat.parentId === id);
    if (hasChildren) {
      setError('Спочатку перенесіть або видаліть підкатегорії цієї групи');
      setTimeout(() => setError(''), 2500);
      return;
    }

    if (!window.confirm('Видалити категорію?')) return;
    setLoading(true);
    try {
      await deleteCategory(id);
      await loadCategories();
    } finally {
      setLoading(false);
    }
  };

  const moveCategory = async (categoryId, direction) => {
    const current = categories.find((cat) => cat.id === categoryId);
    if (!current) return;

    const siblings = categories
      .filter((cat) => (cat.parentId || '') === (current.parentId || ''))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

    const index = siblings.findIndex((cat) => cat.id === categoryId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const target = siblings[targetIndex];
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
      <h3 className="text-xl font-bold mb-2">Категорії та підкатегорії</h3>
      <p className="text-sm text-slate-500 mb-4">
        Оберіть батьківську категорію, щоб створити компактну підкатегорію для другого ряду на головній.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        {error && <div className="text-red-600 font-medium w-full">{error}</div>}
        {success && <div className="text-green-600 font-medium w-full">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Назва категорії"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
            required
          />
          <input
            type="text"
            placeholder="Опис (необов'язково)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900"
          />
          <input
            type="url"
            placeholder="URL зображення категорії"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900"
            autoComplete="off"
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-900 font-semibold"
          >
            <option value="">Головна категорія</option>
            {rootCategories
              .filter((cat) => cat.id !== editingId)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition min-w-[120px]">
            {editingId ? 'Зберегти' : 'Додати'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
            >
              Скасувати
            </button>
          )}
          {icon && (
            <img
              src={icon}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-xl border border-slate-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>
      </form>

      {loading ? (
        <p>Завантаження...</p>
      ) : groupedCategories.length === 0 ? (
        <p className="text-slate-500">Категорії ще не створені</p>
      ) : (
        <div className="space-y-4">
          {groupedCategories.map(({ parent, children }) => (
            <div key={parent.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              {!parent.isVirtual ? (
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {parent.icon ? (
                      <img
                        src={parent.icon}
                        alt={parent.name}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-lg">📁</div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{parent.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] uppercase tracking-wide">Головна</span>
                      </div>
                      {parent.description ? <div className="text-slate-500 text-sm">{parent.description}</div> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 lg:ml-auto flex-wrap">
                    <button
                      onClick={() => moveCategory(parent.id, -1)}
                      disabled={loading}
                      className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      title="Вгору"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => moveCategory(parent.id, 1)}
                      disabled={loading}
                      className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      title="Вниз"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={() => handleEdit(parent)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold">Редагувати</button>
                    <button onClick={() => handleDelete(parent.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold">Видалити</button>
                  </div>
                </div>
              ) : (
                <div className="font-semibold text-amber-700">{parent.name}</div>
              )}

              {children.length > 0 && (
                <div className="mt-3 pl-3 md:pl-6 border-l-2 border-slate-200 space-y-2">
                  {children.map((cat) => (
                    <div key={cat.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 py-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <CornerDownRight size={16} className="text-slate-400 shrink-0" />
                        {cat.icon ? (
                          <img
                            src={cat.icon}
                            alt={cat.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-sm">🏷️</div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">{cat.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] uppercase tracking-wide">Підкатегорія</span>
                          </div>
                          {cat.description ? <div className="text-slate-500 text-sm">{cat.description}</div> : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:ml-auto flex-wrap">
                        <button
                          onClick={() => moveCategory(cat.id, -1)}
                          disabled={loading}
                          className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          title="Вгору"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => moveCategory(cat.id, 1)}
                          disabled={loading}
                          className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          title="Вниз"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button onClick={() => handleEdit(cat)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold">Редагувати</button>
                        <button onClick={() => handleDelete(cat.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold">Видалити</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
