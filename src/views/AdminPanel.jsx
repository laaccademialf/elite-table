import { useState, useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getOrderStats,
  getOrders,
  updateOrderStatus,
} from '../services/firebase';
import { Upload, Trash2, Edit, Save, X } from 'lucide-react';

export function AdminPanel() {
  const { adminTab, setAdminTab, currentUser } = useAppContext();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Product form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: 'plates',
    image: '',
  });

  // Load data based on tab
  useEffect(() => {
    loadData();
  }, [adminTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (adminTab === 'inventory') {
        const data = await getProducts();
        setProducts(data);
      } else if (adminTab === 'orders') {
        const allOrders = await getOrders({ limit: 100 });
        setOrders(allOrders);
      } else if (adminTab === 'analytics') {
        const data = await getOrderStats();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('Заповніть обов\'язкові поля');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await updateProduct(editingId, {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          category: formData.category,
          image: formData.image,
        });
      } else {
        await addProduct({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          category: formData.category,
          image: formData.image,
        });
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        quantity: '',
        category: 'plates',
        image: '',
      });
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Помилка при збереженні товару');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      image: product.image || '',
    });
  };

  const handleDelete = async (productId) => {
    if (!confirm('Ви впевнені?')) return;

    try {
      setLoading(true);
      await deleteProduct(productId);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Помилка при видаленні товару');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: 'plates',
      image: '',
    });
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">ПАНЕЛЬ МЕНЕДЖЕРА</h1>
          <p className="text-slate-600">Привіт, {currentUser?.name}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 bg-white rounded-2xl p-4 shadow-sm">
          {['inventory', 'orders', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                adminTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'inventory' && '🍽️ Товари'}
              {tab === 'orders' && '📦 Замовлення'}
              {tab === 'analytics' && '📊 Аналітика'}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {adminTab === 'inventory' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Add/Edit Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm h-fit">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editingId ? 'Редагувати товар' : 'Додати товар'}
              </h2>

              <form onSubmit={handleAddProduct} className="space-y-4">
                <input
                  type="text"
                  placeholder="Назва"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  required
                />

                <textarea
                  placeholder="Опис"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  rows="3"
                />

                <input
                  type="number"
                  placeholder="Ціна (₴)"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  required
                />

                <input
                  type="number"
                  placeholder="Кількість"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  required
                />

                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                >
                  <option value="plates">Тарілки</option>
                  <option value="glasses">Келихи</option>
                  <option value="cutlery">Прибори</option>
                  <option value="textiles">Текстиль</option>
                  <option value="other">Інше</option>
                </select>

                <input
                  type="url"
                  placeholder="URL фото"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save className="inline mr-2" size={18} />
                    {editingId ? 'Зберегти' : 'Додати'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-3 bg-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-300"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Products List */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Товари ({products.length})</h2>

              {loading && <p className="text-slate-600">Завантажування...</p>}

              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{product.name}</h3>
                      <p className="text-slate-600 text-sm">{product.description}</p>
                      <p className="text-slate-900 font-bold mt-2">
                        {product.price} ₴ | Кількість: {product.quantity}
                      </p>
                      <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        {product.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {adminTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Управління замовленнями</h2>

            {loading && <p className="text-slate-600">Завантажування...</p>}

            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        Замовлення #{order.id?.slice(0, 8)}
                      </h3>
                      <p className="text-slate-600">
                        Клієнт: {order.customerName} ({order.customerEmail})
                      </p>
                      <p className="text-slate-600">Телефон: {order.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{order.totalPrice} ₴</p>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="mt-2 px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                      >
                        <option value="pending">Очікування</option>
                        <option value="confirmed">Підтверджено</option>
                        <option value="delivered">Доставлено</option>
                        <option value="cancelled">Скасовано</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Товари:</h4>
                    <ul className="space-y-1 text-slate-600">
                      {order.items?.map((item, idx) => (
                        <li key={idx}>
                          • {item.productName} × {item.quantity} ({item.price} ₴)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {adminTab === 'analytics' && stats && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Загальна виручка</h3>
              <p className="text-4xl font-bold text-slate-900">{stats.totalRevenue} ₴</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Всього замовлень</h3>
              <p className="text-4xl font-bold text-slate-900">{stats.totalOrders}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Завершено</h3>
              <p className="text-4xl font-bold text-green-600">{stats.completedOrders}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Очікування</h3>
              <p className="text-4xl font-bold text-yellow-600">{stats.pendingOrders}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Скасовано</h3>
              <p className="text-4xl font-bold text-red-600">{stats.cancelledOrders}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-600 font-semibold mb-2">Середнє замовлення</h3>
              <p className="text-4xl font-bold text-slate-900">{stats.averageOrderValue.toFixed(2)} ₴</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
