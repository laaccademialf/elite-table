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
  deleteOrder,
  createProductsBulk,
} from '../services/firebase';
import { Upload, Trash2, Edit, Save, X, Calendar, ChevronDown, Download, FileUp } from 'lucide-react';
import CategoryManager from '../components/CategoryManager';
import DateRangePicker from '../components/DateRangePicker';
import { getCategories } from '../services/categories';
import { CustomCalendar } from '../components/CustomCalendar';
import UsersView from './UserManagement';
import { exportProductsToExcel, downloadExcelTemplate, importProductsFromExcel } from '../utils/excelUtils';

// Helper to format date object or string to DD.MM.YYYY
const formatDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date.day && date.month && date.year) {
    const d = String(date.day).padStart(2, '0');
    const m = String(date.month).padStart(2, '0');
    return `${d}.${m}.${date.year}`;
  }
  return '';
};

// Helper to format date range
const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (!start) return 'Не вказано';
  if (!end || start === end) return start;
  return `${start} — ${end}`;
};

export function AdminPanel() {
  const { adminTab, setAdminTab, currentUser } = useAppContext();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  // --- categories state ---
  const [categories, setCategories] = useState([]);

  // Підменю для "Товари"
  const [inventorySubTab, setInventorySubTab] = useState('categories'); // 'categories' | 'products'

  // Filters state
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Product form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    image: '',
  });

  // Import/Export state
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

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
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          category: formData.category,
          image: formData.image,
        });
      } else {
        await addProduct({
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          category: formData.category,
          image: formData.image,
        });
      }

      setFormData({
        sku: '',
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
      sku: product.sku || '',
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
      sku: '',
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: 'plates',
      image: '',
    });
  };

  const handleExportProducts = () => {
    try {
      exportProductsToExcel(filteredProducts);
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Помилка експорту товарів');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExcelTemplate();
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Помилка завантаження шаблону');
    }
  };

  const handleImportProducts = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportResult(null);

    try {
      // Імпортуємо дані з Excel
      const productsData = await importProductsFromExcel(file);
      
      if (productsData.length === 0) {
        alert('Файл не містить валідних товарів');
        return;
      }

      // Підтвердження від користувача
      const confirmed = window.confirm(
        `Знайдено ${productsData.length} товарів для імпорту. Продовжити?`
      );
      
      if (!confirmed) {
        setImportLoading(false);
        return;
      }

      // Створюємо товари масово
      const result = await createProductsBulk(productsData);
      
      setImportResult(result);
      
      // Показуємо результат
      const message = `
Імпорт завершено!
Створено нових: ${result.created.length}
Оновлено існуючих: ${result.updated.length}
Помилки: ${result.errors.length}
${result.errors.length > 0 ? '\nТовари з помилками:\n' + result.errors.map(e => `- ${e.product}: ${e.error}`).join('\n') : ''}
      `.trim();
      
      alert(message);
      
      // Оновлюємо список товарів
      await loadData();
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Помилка імпорту: ' + error.message);
    } finally {
      setImportLoading(false);
      // Скидаємо input, щоб можна було імпортувати той самий файл знову
      event.target.value = '';
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Ви впевнені, що хочете видалити це замовлення?')) return;

    try {
      setLoading(true);
      await deleteOrder(orderId);
      loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Помилка при видаленні замовлення');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Очікування';
      case 'confirmed':
        return 'Підтверджено';
      case 'delivered':
        return 'Доставлено';
      case 'cancelled':
        return 'Скасовано';
      default:
        return status;
    }
  };

  // Helper to check if date is within range
  const dateInRange = (date, startDate, endDate) => {
    if (!startDate && !endDate) return true;
    
    const dateStr = formatDate(date);
    if (!dateStr) return false;
    
    // Parse DD.MM.YYYY to Date
    const [day, month, year] = dateStr.split('.').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setHours(0, 0, 0, 0);
    
    if (startDate) {
      const start = new Date(startDate.year, startDate.month - 1, startDate.day);
      start.setHours(0, 0, 0, 0);
      if (dateObj < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate.year, endDate.month - 1, endDate.day);
      end.setHours(23, 59, 59, 999);
      if (dateObj > end) return false;
    }
    
    return true;
  };

  // Helper to check if order date range overlaps with filter range
  const orderDateRangeOverlaps = (orderStartDate, orderEndDate, filterStart, filterEnd) => {
    if (!filterStart && !filterEnd) return true;
    
    // Parse order dates
    const orderStartStr = formatDate(orderStartDate);
    const orderEndStr = formatDate(orderEndDate || orderStartDate);
    
    console.log('[Filter Debug] Order dates:', { 
      orderStartDate, 
      orderEndDate, 
      orderStartStr, 
      orderEndStr,
      filterStart,
      filterEnd
    });
    
    if (!orderStartStr) return false;
    
    const [d1, m1, y1] = orderStartStr.split('.').map(Number);
    const orderStart = new Date(y1, m1 - 1, d1);
    orderStart.setHours(0, 0, 0, 0);
    
    const [d2, m2, y2] = orderEndStr.split('.').map(Number);
    const orderEnd = new Date(y2, m2 - 1, d2);
    orderEnd.setHours(23, 59, 59, 999);
    
    // Parse filter dates
    let filterStartDate = null;
    let filterEndDate = null;
    
    if (filterStart) {
      filterStartDate = new Date(filterStart.year, filterStart.month, filterStart.day);
      filterStartDate.setHours(0, 0, 0, 0);
    }
    
    if (filterEnd) {
      filterEndDate = new Date(filterEnd.year, filterEnd.month, filterEnd.day);
      filterEndDate.setHours(23, 59, 59, 999);
    }
    
    console.log('[Filter Debug] Parsed dates:', {
      orderStart: orderStart.toISOString(),
      orderEnd: orderEnd.toISOString(),
      filterStartDate: filterStartDate?.toISOString(),
      filterEndDate: filterEndDate?.toISOString()
    });
    
    // Check for overlap: order and filter ranges intersect
    // Order overlaps if: orderStart <= filterEnd AND orderEnd >= filterStart
    if (filterStartDate && orderEnd < filterStartDate) {
      console.log('[Filter Debug] Order ends before filter starts - EXCLUDED');
      return false;
    }
    if (filterEndDate && orderStart > filterEndDate) {
      console.log('[Filter Debug] Order starts after filter ends - EXCLUDED');
      return false;
    }
    
    console.log('[Filter Debug] Order overlaps with filter - INCLUDED');
    return true;
  };

  // Filter products by category
  const filteredProducts = products.filter(product => {
    if (productCategoryFilter === 'all') return true;
    return product.category === productCategoryFilter;
  });

  // Filter orders by status and date
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
      return false;
    }
    
    // Date filter - check if order date range overlaps with filter range
    if (orderDateFilter.start || orderDateFilter.end) {
      if (!orderDateRangeOverlaps(order.eventDate, order.eventEndDate, orderDateFilter.start, orderDateFilter.end)) {
        return false;
      }
    }
    
    return true;
  });

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
          {['inventory', 'orders', 'analytics', 'users'].map((tab) => (
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
              {tab === 'users' && '👥 Користувачі'}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {adminTab === 'inventory' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-8">
            <div className="flex gap-4 mb-6">
              <button
                className={`px-6 py-2 rounded-xl font-semibold transition ${inventorySubTab === 'categories' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setInventorySubTab('categories')}
              >
                Управління категоріями
              </button>
              <button
                className={`px-6 py-2 rounded-xl font-semibold transition ${inventorySubTab === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setInventorySubTab('products')}
              >
                Управління товарами
              </button>
            </div>
            {inventorySubTab === 'categories' && (
              <CategoryManager onCategoryChange={setCategories} />
            )}
            {inventorySubTab === 'products' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Add/Edit Form */}
                <div className="bg-white rounded-2xl p-6 shadow-sm h-fit">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {editingId ? 'Редагувати товар' : 'Додати товар'}
                  </h2>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Артикул (опціонально)"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Назва"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                      required
                    />
                    <textarea
                      placeholder="Опис"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                      rows="3"
                    />
                    <input
                      type="number"
                      placeholder="Ціна (₴)"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Кількість"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                      required
                    />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-900 font-semibold"
                    >
                      <option value="">Оберіть категорію</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <input
                      type="url"
                      placeholder="URL фото"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
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
                  {/* Import/Export Controls */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Імпорт / Експорт товарів</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition shadow-sm"
                      >
                        <Download size={18} />
                        Завантажити шаблон
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition cursor-pointer shadow-sm">
                        <FileUp size={18} />
                        {importLoading ? 'Імпорт...' : 'Імпортувати Excel'}
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportProducts}
                          disabled={importLoading}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={handleExportProducts}
                        disabled={filteredProducts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                      >
                        <Upload size={18} />
                        Експортувати в Excel
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-3">
                      💡 Завантажте шаблон, заповніть його даними та імпортуйте для швидкого додавання товарів
                    </p>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Товари ({filteredProducts.length})</h2>
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    >
                      <option value="all">Всі категорії</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {loading && <p className="text-slate-600">Завантажування...</p>}
                  <div className="space-y-4">
                    {filteredProducts.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center">
                        <p className="text-slate-600 text-lg">Товарів не знайдено</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">{product.name}</h3>
                            {product.sku && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                {product.sku}
                              </span>
                            )}
                          </div>
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {adminTab === 'orders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Управління замовленнями</h2>
              <div className="flex gap-4 items-center">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="all">Всі статуси</option>
                  <option value="pending">Очікування</option>
                  <option value="confirmed">Підтверджено</option>
                  <option value="delivered">Доставлено</option>
                  <option value="cancelled">Скасовано</option>
                </select>
                <DateRangePicker
                  value={{ start: orderDateFilter.start, end: orderDateFilter.end }}
                  onChange={(dateRange) => setOrderDateFilter({ start: dateRange.start, end: dateRange.end })}
                />
                {(orderStatusFilter !== 'all' || orderDateFilter.start || orderDateFilter.end) && (
                  <button
                    onClick={() => {
                      setOrderStatusFilter('all');
                      setOrderDateFilter({ start: null, end: null });
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors whitespace-nowrap"
                  >
                    Скинути
                  </button>
                )}
              </div>
            </div>

            {loading && <p className="text-slate-600">Завантажування...</p>}

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <p className="text-slate-600 text-lg">Замовлень не знайдено</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Compacted Order Header */}
                  <button
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition text-left"
                  >
                    <div className="flex-1 flex items-center gap-6">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg mb-1">
                          Замовлення #{order.id?.slice(0, 8)}
                        </h3>
                        <p className="text-slate-600 text-sm">
                          {order.customerName} • {formatDateRange(order.eventDate, order.eventEndDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{order.totalPrice} ₴</p>
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`ml-4 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Horizontal Action Buttons (always visible) */}
                  <div className="px-6 pb-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <select
                      value={order.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateOrderStatus(order.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-4 py-2 border-2 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all text-sm ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Очікування</option>
                      <option value="confirmed">Підтверджено</option>
                      <option value="delivered">Доставлено</option>
                      <option value="cancelled">Скасовано</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id);
                      }}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Trash2 size={16} />
                      Видалити
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedOrderId === order.id && (
                    <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Клієнт:</span> {order.customerName}
                          </p>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Email:</span> {order.customerEmail}
                          </p>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Телефон:</span> {order.customerPhone}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Адреса доставки:</span> {order.address}
                          </p>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Коментар:</span> {order.notes || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Товари:</h4>
                        <ul className="space-y-1 text-slate-600 text-sm">
                          {order.items?.map((item, idx) => (
                            <li key={idx}>
                              • {item.productName} × {item.quantity} ({item.price} ₴)
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                ))
              )}
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

        {/* Users Tab */}
        {adminTab === 'users' && (
          <UsersView />
        )}
      </div>
    </div>
  );
}
