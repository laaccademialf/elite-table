import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/useAppContext';
import {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getOrderStats,
  getOrders,
  updateOrderStatus,
  updateOrderManagerNotes,
  deleteOrder,
  createProductsBulk,
  assignOrderToManager,
  updateOrderItems,
  addExtraService,
  updateExtraService,
  deleteExtraService,
} from '../services/firebase';
import { Upload, Trash2, Edit, Save, X, Calendar, ChevronDown, Download, FileUp, ArrowUp, ArrowDown, UserCheck, Bell } from 'lucide-react';
import CategoryManager from '../components/CategoryManager';
import GalleryManager from '../components/GalleryManager';
import DateRangePicker from '../components/DateRangePicker';
import { getCategories } from '../services/categories';
import { CustomCalendar } from '../components/CustomCalendar';
import UsersView from './UserManagement';
import { exportProductsToExcel, downloadExcelTemplate, importProductsFromExcel } from '../utils/excelUtils';
import { downloadOrderInvoicePdf } from '../utils/pdfInvoice';
import { getLiqPaySettings, saveLiqPaySettings } from '../services/liqpay';
import { Timestamp } from 'firebase/firestore';

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

// Helper to calculate rental days from date strings (DD.MM.YYYY format)
const calculateRentalDays = (eventDate, eventEndDate) => {
  if (!eventDate || !eventEndDate) return 1;
  
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  };
  
  const startDate = parseDate(eventDate);
  const endDate = parseDate(eventEndDate);
  
  if (!startDate || !endDate) return 1;
  
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  return Math.max(1, diffDays);
};

// Safe customer display name
const calculateItemsSubtotal = (items = [], rentalDays = 1) => {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    return sum + (quantity * price * Math.max(1, Number(rentalDays || 1)));
  }, 0);
};

const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());

  if (typeof value === 'string') {
    if (value.includes('.')) {
      const [day, month, year] = value.split('.').map(Number);
      if (day && month && year) return new Date(year, month - 1, day);
    }

    if (value.includes('-')) {
      const [year, month, day] = value.split('-').map(Number);
      if (day && month && year) return new Date(year, month - 1, day);
    }
  }

  if (value?.day !== undefined && value?.month !== undefined && value?.year !== undefined) {
    return new Date(value.year, value.month, value.day);
  }

  return null;
};

const toInputDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultWarehouseDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toInputDateValue(date);
};

const isSameCalendarDay = (left, right) => {
  if (!left || !right) return false;
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
};

const formatCustomerName = (order) => {
  if (!order) return 'Клієнт';
  if (order.customerName && order.customerName.trim()) return order.customerName.trim();
  if (order.customerEmail) return order.customerEmail.split('@')[0];
  if (order.customerPhone) return order.customerPhone;
  return 'Клієнт';
};

export function AdminPanel() {
  const { adminTab, setAdminTab, currentUser, pendingBadge, pendingNotifications, soundEnabled, toggleSound, removeNotification, soundType, updateSoundType, pushEnabled, togglePushNotifications, playSound, expandedOrderId, setExpandedOrderId: setContextExpandedOrderId, extraServices } = useAppContext();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [zoomImg, setZoomImg] = useState(null); // { src, x, y }
  const zoomTimer = useRef(null);
  const [expandedWarehouseId, setExpandedWarehouseId] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  // --- categories state ---
  const [categories, setCategories] = useState([]);

  // Підменю для "Товари"
  const [inventorySubTab, setInventorySubTab] = useState('categories'); // 'categories' | 'products' | 'services'

  // Settings UI state
  const [expandSoundType, setExpandSoundType] = useState(false);
  const [serviceEditingId, setServiceEditingId] = useState(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price: '',
    billingType: 'fixed',
    active: true,
  });
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false);
  const [paymentSettingsMessage, setPaymentSettingsMessage] = useState('');
  const [paymentSettingsError, setPaymentSettingsError] = useState('');
  const [paymentSettingsForm, setPaymentSettingsForm] = useState({
    publicKey: '',
    privateKey: '',
    privateKeyPreview: '',
    sandbox: true,
    appBaseUrl: '',
    hasPublicKey: false,
    hasPrivateKey: false,
    updatedAt: '',
  });

  // Filters state
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderManagerFilter, setOrderManagerFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localExpandedOrderId, setLocalExpandedOrderId] = useState(null);
  const [editingOrderNotes, setEditingOrderNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [notesSaved, setNotesSaved] = useState({});
  const [editingOrderItems, setEditingOrderItems] = useState({});
  const [editingOrderServices, setEditingOrderServices] = useState({});
  const [savingOrderEdits, setSavingOrderEdits] = useState({});

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

  // Analytics filters
  const [analyticsDateRange, setAnalyticsDateRange] = useState({ start: null, end: null });
  const [showAnalyticsDatePicker, setShowAnalyticsDatePicker] = useState(false);
  const [analyticsManagerFilter, setAnalyticsManagerFilter] = useState('all');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('sales'); // 'sales' | 'customers' | 'products'
  const [analyticsProducts, setAnalyticsProducts] = useState([]);
  const [warehouseDate, setWarehouseDate] = useState(getDefaultWarehouseDate());
  const [warehouseMode, setWarehouseMode] = useState('packing');

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (adminTab === 'settings' && currentUser?.role === 'manager') {
      loadPaymentSettings();
    }
  }, [adminTab, currentUser?.role]);

  const categoryOptions = useMemo(() => {
    const rootCategories = categories.filter((cat) => !cat.parentId);

    if (rootCategories.length === 0) {
      return categories.map((cat) => ({ value: cat.name, label: cat.name }));
    }

    return rootCategories.flatMap((parent) => {
      const children = categories.filter((cat) => cat.parentId === parent.id);
      if (children.length === 0) {
        return [{ value: parent.name, label: parent.name }];
      }

      return [
        { value: parent.name, label: `${parent.name} (вся група)` },
        ...children.map((child) => ({ value: child.name, label: `↳ ${child.name}` })),
      ];
    });
  }, [categories]);

  const sortedExtraServices = useMemo(
    () => [...(extraServices || [])].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [extraServices]
  );

  // Sync expanded order from context
  useEffect(() => {
    if (expandedOrderId) {
      setLocalExpandedOrderId(expandedOrderId);
      setContextExpandedOrderId(null);
    }
  }, [expandedOrderId, setContextExpandedOrderId]);

  // Load data based on tab
  useEffect(() => {
    loadData();
  }, [adminTab, analyticsDateRange, analyticsManagerFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (adminTab === 'inventory') {
        const data = await getProducts();
        setProducts(data);
      } else if (adminTab === 'orders' || adminTab === 'warehouse') {
        const [allOrders, allProducts] = await Promise.all([
          getOrders({ limit: 100 }),
          getProducts(),
        ]);
        setOrders(allOrders);
        setProducts(allProducts || []);
      } else if (adminTab === 'analytics') {
        // Завантажуємо статистику з фільтром по датах та менеджерам
        let dateRange = {};
        if (analyticsDateRange.start && analyticsDateRange.end) {
          const startDate = new Date(
            analyticsDateRange.start.year,
            analyticsDateRange.start.month,
            analyticsDateRange.start.day
          );
          const endDate = new Date(
            analyticsDateRange.end.year,
            analyticsDateRange.end.month,
            analyticsDateRange.end.day,
            23, 59, 59
          );
          dateRange = { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
        }
        const managerId = analyticsManagerFilter === 'all' ? null : analyticsManagerFilter;
        const [data, prods] = await Promise.all([
          getOrderStats(dateRange, managerId),
          getProducts(),
        ]);
        setStats(data);
        setAnalyticsProducts(prods || []);
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
        category: '',
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
      category: '',
      image: '',
    });
  };

  const resetServiceForm = () => {
    setServiceEditingId(null);
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      billingType: 'fixed',
      active: true,
    });
  };

  const loadPaymentSettings = async () => {
    try {
      setPaymentSettingsLoading(true);
      setPaymentSettingsError('');
      const settings = await getLiqPaySettings();
      setPaymentSettingsForm({
        publicKey: settings.publicKey || '',
        privateKey: '',
        privateKeyPreview: settings.privateKeyPreview || '',
        sandbox: settings.sandbox === true,
        appBaseUrl: settings.appBaseUrl || '',
        hasPublicKey: settings.hasPublicKey === true,
        hasPrivateKey: settings.hasPrivateKey === true,
        updatedAt: settings.updatedAt || '',
      });
    } catch (error) {
      console.error('Error loading LiqPay settings:', error);
      setPaymentSettingsError(error.message || 'Не вдалося завантажити налаштування LiqPay.');
    } finally {
      setPaymentSettingsLoading(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();

    if (!paymentSettingsForm.publicKey.trim()) {
      setPaymentSettingsError('Вкажіть public key LiqPay.');
      return;
    }

    try {
      setPaymentSettingsSaving(true);
      setPaymentSettingsError('');
      setPaymentSettingsMessage('');

      const result = await saveLiqPaySettings({
        publicKey: paymentSettingsForm.publicKey.trim(),
        privateKey: paymentSettingsForm.privateKey.trim(),
        sandbox: paymentSettingsForm.sandbox,
        appBaseUrl: paymentSettingsForm.appBaseUrl.trim(),
      });

      setPaymentSettingsForm((prev) => ({
        ...prev,
        publicKey: result.publicKey || prev.publicKey,
        privateKey: '',
        privateKeyPreview: result.privateKeyPreview || prev.privateKeyPreview,
        sandbox: result.sandbox === true,
        appBaseUrl: result.appBaseUrl || '',
        hasPublicKey: result.hasPublicKey === true,
        hasPrivateKey: result.hasPrivateKey === true,
        updatedAt: result.updatedAt || prev.updatedAt,
      }));
      setPaymentSettingsMessage('Налаштування LiqPay успішно збережено.');
    } catch (error) {
      console.error('Error saving LiqPay settings:', error);
      setPaymentSettingsError(error.message || 'Не вдалося зберегти налаштування LiqPay.');
    } finally {
      setPaymentSettingsSaving(false);
    }
  };

  const handleSaveExtraService = async (e) => {
    e.preventDefault();

    if (!serviceFormData.name.trim()) {
      alert('Вкажіть назву послуги');
      return;
    }

    const price = Number(serviceFormData.price);
    if (Number.isNaN(price) || price < 0) {
      alert('Вкажіть коректну вартість послуги');
      return;
    }

    try {
      setServiceSaving(true);

      const payload = {
        name: serviceFormData.name.trim(),
        description: serviceFormData.description.trim(),
        price,
        billingType: serviceFormData.billingType === 'per_day' ? 'per_day' : 'fixed',
        active: serviceFormData.active,
      };

      if (serviceEditingId) {
        await updateExtraService(serviceEditingId, payload);
      } else {
        await addExtraService(payload);
      }

      resetServiceForm();
    } catch (error) {
      console.error('Error saving extra service:', error);
      alert('Не вдалося зберегти послугу');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleEditService = (service) => {
    setServiceEditingId(service.id);
    setServiceFormData({
      name: service.name || '',
      description: service.description || '',
      price: String(service.price ?? ''),
      billingType: service.billingType || 'fixed',
      active: service.active !== false,
    });
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Видалити цю додаткову послугу?')) return;

    try {
      await deleteExtraService(serviceId);
      if (serviceEditingId === serviceId) {
        resetServiceForm();
      }
    } catch (error) {
      console.error('Error deleting extra service:', error);
      alert('Не вдалося видалити послугу');
    }
  };

  const moveProduct = async (index, direction) => {
    // direction: -1 up, +1 down
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;
    const current = filteredProducts[index];
    const target = filteredProducts[targetIndex];

    // Призначаємо fallback order, якщо його немає
    const currentOrder = current.order ?? index + 1;
    const targetOrder = target.order ?? targetIndex + 1;

    setLoading(true);
    try {
      await Promise.all([
        updateProduct(current.id, { order: targetOrder }),
        updateProduct(target.id, { order: currentOrder }),
      ]);
      await loadData();
    } finally {
      setLoading(false);
    }
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

  const handleUpdateOrderStatus = async (order, newStatus) => {
    if (!order.assignedManagerId) {
      alert('Спочатку призначте менеджера перед зміною статусу');
      return;
    }

    if (newStatus === 'pending' && order.status !== 'pending') {
      alert('Повернути в "Очікування" після старту роботи не можна');
      return;
    }

    try {
      await updateOrderStatus(order.id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleAssignToMe = async (orderId) => {
    try {
      const managerName = currentUser.name || currentUser.displayName || currentUser.email || 'Менеджер';
      
      // Знайди сповіщення для цього замовлення
      const notif = pendingNotifications.find((n) => n.orderId === orderId);
      const notifId = notif?.id;
      console.log('[AdminPanel] handleAssignToMe for order', orderId, 'notification:', notifId);
      
      await assignOrderToManager(orderId, currentUser.uid, managerName);
      
      // Видали сповіщення плавно через 3 секунди
      if (notifId) {
        console.log('[AdminPanel] Scheduling notification removal for', notifId);
        removeNotification(notifId, 3000);
      }
      
      loadData();
    } catch (error) {
      console.error('Error assigning order:', error);
      alert('Помилка при призначенні замовлення');
    }
  };

  const handleSaveManagerNotes = async (orderId) => {
    try {
      setSavingNotes((prev) => ({ ...prev, [orderId]: true }));
      const notes = editingOrderNotes[orderId] ?? '';
      await updateOrderManagerNotes(orderId, notes);
      setNotesSaved((prev) => ({ ...prev, [orderId]: true }));
      await loadData();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Помилка при збереженні нотаток');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const startEditingOrderItems = (order) => {
    setEditingOrderItems((prev) => ({
      ...prev,
      [order.id]: (order.items || []).map((item) => ({
        productId: item.productId || '',
        productName: item.productName || '',
        sku: item.sku || '',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        category: item.category || 'Інше',
        packedQuantity: Number(item.packedQuantity || 0),
        returnedQuantity: Number(item.returnedQuantity || 0),
        brokenQuantity: Number(item.brokenQuantity || 0),
      })),
    }));

    setEditingOrderServices((prev) => ({
      ...prev,
      [order.id]: (order.extraServices || []).map((service) => ({
        serviceId: service.serviceId || '',
        name: service.name || '',
        description: service.description || '',
        price: Number(service.price || 0),
        billingType: service.billingType === 'per_day' ? 'per_day' : 'fixed',
      })),
    }));
  };

  const cancelEditingOrderItems = (orderId) => {
    setEditingOrderItems((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setEditingOrderServices((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const updateEditingOrderItem = (orderId, index, field, value) => {
    setEditingOrderItems((prev) => {
      const fallbackOrder = orders.find((order) => order.id === orderId);
      const baseRows = prev[orderId]?.length
        ? prev[orderId]
        : (fallbackOrder?.items || []).map((item) => ({
            productId: item.productId || '',
            productName: item.productName || '',
            sku: item.sku || '',
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
            category: item.category || 'Інше',
            packedQuantity: Number(item.packedQuantity || 0),
            returnedQuantity: Number(item.returnedQuantity || 0),
            brokenQuantity: Number(item.brokenQuantity || 0),
          }));
      const rows = [...baseRows];
      const currentRow = { ...(rows[index] || {}) };
      const orderQuantity = Math.max(1, Number(field === 'quantity' ? value || 1 : currentRow.quantity || 1));

      if (field === 'productId') {
        const selectedProduct = products.find((product) => product.id === value);
        rows[index] = {
          ...currentRow,
          productId: value,
          productName: selectedProduct?.name || currentRow.productName || '',
          sku: selectedProduct?.sku || currentRow.sku || '',
          price: Number(selectedProduct?.price ?? currentRow.price ?? 0),
          category: selectedProduct?.category || currentRow.category || 'Інше',
        };
      } else if (field === 'returnedQuantity') {
        const returnedQuantity = Math.min(orderQuantity, Math.max(0, Number(value || 0)));
        rows[index] = {
          ...currentRow,
          returnedQuantity,
          brokenQuantity: Math.max(0, orderQuantity - returnedQuantity),
        };
      } else if (field === 'brokenQuantity') {
        const brokenQuantity = Math.min(orderQuantity, Math.max(0, Number(value || 0)));
        rows[index] = {
          ...currentRow,
          brokenQuantity,
          returnedQuantity: Math.max(0, orderQuantity - brokenQuantity),
        };
      } else if (field === 'packedQuantity') {
        rows[index] = {
          ...currentRow,
          packedQuantity: Math.min(orderQuantity, Math.max(0, Number(value || 0))),
        };
      } else if (field === 'quantity') {
        const brokenQuantity = Math.min(orderQuantity, Math.max(0, Number(currentRow.brokenQuantity || 0)));
        rows[index] = {
          ...currentRow,
          quantity: orderQuantity,
          packedQuantity: Math.min(orderQuantity, Math.max(0, Number(currentRow.packedQuantity || 0))),
          returnedQuantity: Math.min(orderQuantity - brokenQuantity, Math.max(0, Number(currentRow.returnedQuantity || 0))),
          brokenQuantity,
        };
      } else {
        rows[index] = {
          ...currentRow,
          [field]: ['price'].includes(field)
            ? Number(value || 0)
            : value,
        };
      }

      return {
        ...prev,
        [orderId]: rows,
      };
    });
  };

  const addOrderItemRow = (orderId) => {
    const fallbackProduct = products[0];
    setEditingOrderItems((prev) => ({
      ...prev,
      [orderId]: [
        ...(prev[orderId] || []),
        {
          productId: fallbackProduct?.id || '',
          productName: fallbackProduct?.name || '',
          sku: fallbackProduct?.sku || '',
          quantity: 1,
          price: Number(fallbackProduct?.price || 0),
          category: fallbackProduct?.category || 'Інше',
          packedQuantity: 0,
          returnedQuantity: 0,
          brokenQuantity: 0,
        },
      ],
    }));
  };

  const removeOrderItemRow = (orderId, index) => {
    setEditingOrderItems((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateEditingOrderService = (orderId, index, field, value) => {
    setEditingOrderServices((prev) => {
      const fallbackOrder = orders.find((order) => order.id === orderId);
      const baseRows = prev[orderId]?.length
        ? prev[orderId]
        : (fallbackOrder?.extraServices || []).map((service) => ({
            serviceId: service.serviceId || '',
            name: service.name || '',
            description: service.description || '',
            price: Number(service.price || 0),
            billingType: service.billingType === 'per_day' ? 'per_day' : 'fixed',
          }));
      const rows = [...baseRows];
      const currentRow = { ...(rows[index] || {}) };

      if (field === 'serviceId') {
        const selectedService = sortedExtraServices.find((service) => service.id === value);
        rows[index] = {
          ...currentRow,
          serviceId: value,
          name: selectedService?.name || currentRow.name || '',
          description: selectedService?.description || currentRow.description || '',
          price: Number(selectedService?.price ?? currentRow.price ?? 0),
          billingType: selectedService?.billingType === 'per_day' ? 'per_day' : (currentRow.billingType || 'fixed'),
        };
      } else {
        rows[index] = {
          ...currentRow,
          [field]: field === 'price' ? Number(value || 0) : value,
        };
      }

      return {
        ...prev,
        [orderId]: rows,
      };
    });
  };

  const addOrderServiceRow = (orderId) => {
    const fallbackService = sortedExtraServices[0];
    setEditingOrderServices((prev) => ({
      ...prev,
      [orderId]: [
        ...(prev[orderId] || []),
        {
          serviceId: fallbackService?.id || '',
          name: fallbackService?.name || '',
          description: fallbackService?.description || '',
          price: Number(fallbackService?.price || 0),
          billingType: fallbackService?.billingType === 'per_day' ? 'per_day' : 'fixed',
        },
      ],
    }));
  };

  const removeOrderServiceRow = (orderId, index) => {
    setEditingOrderServices((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handleSaveOrderItems = async (order) => {
    const draftItems = editingOrderItems[order.id] ?? (order.items || []);
    const normalizedItems = draftItems
      .filter((item) => item.productId || item.productName)
      .map((item) => {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const brokenQuantity = Math.min(quantity, Math.max(0, Number(item.brokenQuantity || 0)));
        const returnedQuantity = Math.min(quantity - brokenQuantity, Math.max(0, Number(item.returnedQuantity || 0)));
        const packedQuantity = Math.min(quantity, Math.max(0, Number(item.packedQuantity || 0)));

        return {
          productId: item.productId || '',
          productName: item.productName || 'Товар',
          sku: item.sku || '',
          quantity,
          price: Math.max(0, Number(item.price || 0)),
          category: item.category || 'Інше',
          packedQuantity,
          returnedQuantity,
          brokenQuantity,
        };
      });

    if (normalizedItems.length === 0) {
      alert('Замовлення повинно містити хоча б одну позицію');
      return;
    }

    const rentalDays = order.rentalDays || calculateRentalDays(order.eventDate, order.eventEndDate);
    const itemsSubtotal = calculateItemsSubtotal(normalizedItems, rentalDays);
    const draftServices = editingOrderServices[order.id] ?? (order.extraServices || []);
    const normalizedServices = draftServices
      .filter((service) => service.serviceId || service.name)
      .map((service) => {
        const price = Math.max(0, Number(service.price || 0));
        const billingType = service.billingType === 'per_day' ? 'per_day' : 'fixed';
        return {
          serviceId: service.serviceId || '',
          name: service.name || 'Послуга',
          description: service.description || '',
          price,
          billingType,
          total: billingType === 'per_day' ? price * rentalDays : price,
        };
      });
    const servicesTotal = normalizedServices.reduce((sum, service) => sum + Number(service.total || 0), 0);
    const totalPrice = itemsSubtotal + servicesTotal;

    try {
      setSavingOrderEdits((prev) => ({ ...prev, [order.id]: true }));
      await updateOrderItems(order.id, {
        items: normalizedItems,
        extraServices: normalizedServices,
        itemsSubtotal,
        servicesTotal,
        totalPrice,
      });
      cancelEditingOrderItems(order.id);
      await loadData();
    } catch (error) {
      console.error('Error saving order items:', error);
      alert('Не вдалося оновити склад замовлення');
    } finally {
      setSavingOrderEdits((prev) => ({ ...prev, [order.id]: false }));
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

  const handleDownloadInvoice = async (order) => {
    try {
      await downloadOrderInvoicePdf(order);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      alert('Не вдалося згенерувати PDF накладну');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-300';
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
      case 'in_progress':
        return 'В роботі';
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

  const getPaymentStatusColor = (paymentMethod, paymentStatus) => {
    if (paymentMethod === 'liqpay') {
      switch (paymentStatus) {
        case 'paid':
          return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'failed':
          return 'bg-red-100 text-red-700 border-red-200';
        case 'processing':
          return 'bg-blue-100 text-blue-700 border-blue-200';
        default:
          return 'bg-amber-100 text-amber-700 border-amber-200';
      }
    }

    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getPaymentStatusLabel = (paymentMethod, paymentStatus) => {
    if (paymentMethod === 'liqpay') {
      switch (paymentStatus) {
        case 'paid':
          return 'Оплачено LiqPay';
        case 'failed':
          return 'Оплата не пройшла';
        case 'processing':
          return 'Оплата обробляється';
        default:
          return 'Очікує оплату LiqPay';
      }
    }

    return 'Оплата після підтвердження';
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

  // Filter products by category / subcategory group
  const filteredProducts = products.filter((product) => {
    if (productCategoryFilter === 'all') return true;

    const selectedFilterCategory = categories.find((cat) => cat.name === productCategoryFilter);
    if (!selectedFilterCategory) {
      return product.category === productCategoryFilter;
    }

    const relatedCategories = [
      selectedFilterCategory,
      ...categories.filter((cat) => cat.parentId === selectedFilterCategory.id),
    ];

    return relatedCategories.some(
      (cat) => product.category === cat.name || product.categoryId === cat.id
    );
  });

  // Filter orders by status and date
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
      return false;
    }

    // Manager filter
    if (orderManagerFilter !== 'all' && order.assignedManagerId !== orderManagerFilter) {
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

  const getWarehouseDraftItems = (order) => {
    return (editingOrderItems[order.id] ?? (order.items || [])).map((item) => ({
      productId: item.productId || '',
      productName: item.productName || '',
      sku: item.sku || '',
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      category: item.category || 'Інше',
      packedQuantity: Number(item.packedQuantity || 0),
      returnedQuantity: Number(item.returnedQuantity || 0),
      brokenQuantity: Number(item.brokenQuantity || 0),
    }));
  };

  const warehouseDateObject = useMemo(() => parseFlexibleDate(warehouseDate), [warehouseDate]);

  const warehouseOrders = useMemo(() => {
    if (!warehouseDateObject) return [];

    return [...orders]
      .filter((order) => {
        if (order.status === 'cancelled') return false;
        const compareDate = warehouseMode === 'returns'
          ? parseFlexibleDate(order.eventEndDate || order.eventDate)
          : parseFlexibleDate(order.eventDate);
        return isSameCalendarDay(compareDate, warehouseDateObject);
      })
      .sort((a, b) => {
        const left = parseFlexibleDate(warehouseMode === 'returns' ? a.eventEndDate || a.eventDate : a.eventDate);
        const right = parseFlexibleDate(warehouseMode === 'returns' ? b.eventEndDate || b.eventDate : b.eventDate);
        return (left?.getTime() || 0) - (right?.getTime() || 0);
      });
  }, [orders, warehouseMode, warehouseDateObject]);

  const warehouseSummary = useMemo(() => {
    const itemCount = warehouseOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0);
    const unitCount = warehouseOrders.reduce((sum, order) => {
      return sum + (order.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0);
    }, 0);

    return {
      orders: warehouseOrders.length,
      items: itemCount,
      units: unitCount,
    };
  }, [warehouseOrders]);

  const applyWarehouseBulkAction = (order, field) => {
    const updatedItems = getWarehouseDraftItems(order).map((item) => ({
      ...item,
      [field]: field === 'returnedQuantity'
        ? Math.max(0, Number(item.quantity || 0) - Number(item.brokenQuantity || 0))
        : Math.max(0, Number(item.quantity || 0)),
    }));

    setEditingOrderItems((prev) => ({
      ...prev,
      [order.id]: updatedItems,
    }));
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
        <div className="flex gap-4 mb-8 bg-white rounded-2xl p-4 shadow-sm flex-wrap">
          {['inventory', 'gallery', 'orders', 'warehouse', 'analytics', 'users', 'settings'].map((tab) => (
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
              {tab === 'gallery' && '🖼️ Галерея'}
              {tab === 'orders' && '📦 Замовлення'}
              {tab === 'warehouse' && '📋 Склад'}
              {tab === 'analytics' && '📊 Аналітика'}
              {tab === 'users' && '👥 Користувачі'}
              {tab === 'settings' && '⚙️ Налаштування'}
              {tab === 'orders' && pendingBadge > 0 && (
                <span className="ml-2 inline-flex items-center justify-center text-xs font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">
                  {pendingBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        {adminTab === 'gallery' && (
          <GalleryManager />
        )}

        {/* Inventory Tab */}
        {adminTab === 'inventory' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-8">
            <div className="flex flex-wrap gap-4 mb-6">
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
              <button
                className={`px-6 py-2 rounded-xl font-semibold transition ${inventorySubTab === 'services' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setInventorySubTab('services')}
              >
                Управління послугами
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
                      <option value="">Оберіть категорію / підкатегорію</option>
                      {categoryOptions.map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
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
                      {categoryOptions.map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
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
                      filteredProducts.map((product, idx) => (
                        <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center gap-4">
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
                              {product.price} ₴
                            </p>
                            <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                              {product.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveProduct(idx, -1)}
                                disabled={idx === 0 || loading}
                                className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                title="Вгору"
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                onClick={() => moveProduct(idx, 1)}
                                disabled={idx === filteredProducts.length - 1 || loading}
                                className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                title="Вниз"
                              >
                                <ArrowDown size={16} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  const newQuantity = Math.max(0, product.quantity - 1);
                                  try {
                                    await updateProduct(product.id, { quantity: newQuantity });
                                    await loadData();
                                  } catch (error) {
                                    console.error('Error updating quantity:', error);
                                    alert('Помилка оновлення кількості');
                                  }
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition text-xl"
                              >
                                −
                              </button>
                              <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-xs text-slate-600 font-semibold">Кількість</span>
                                <span className="text-lg font-bold text-slate-900">{product.quantity}</span>
                              </div>
                              <button
                                onClick={async () => {
                                  const newQuantity = product.quantity + 1;
                                  try {
                                    await updateProduct(product.id, { quantity: newQuantity });
                                    await loadData();
                                  } catch (error) {
                                    console.error('Error updating quantity:', error);
                                    alert('Помилка оновлення кількості');
                                  }
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition text-xl"
                              >
                                +
                              </button>
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
                          </div>
                        ))
                      )}
                  </div>
                </div>
              </div>
            )}
            {inventorySubTab === 'services' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Управління послугами</h2>
                  <p className="text-sm text-slate-500 mt-1">Тут можна керувати додатковими послугами, які бачить клієнт у кошику.</p>
                </div>

                <form onSubmit={handleSaveExtraService} className="grid md:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <input
                    type="text"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Назва послуги"
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={serviceFormData.price}
                    onChange={(e) => setServiceFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="Вартість, ₴"
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <select
                    value={serviceFormData.billingType}
                    onChange={(e) => setServiceFormData((prev) => ({ ...prev, billingType: e.target.value }))}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="fixed">Фіксована вартість</option>
                    <option value="per_day">За кожну добу оренди</option>
                  </select>
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={serviceFormData.active}
                      onChange={(e) => setServiceFormData((prev) => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    Показувати клієнтам
                  </label>
                  <textarea
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Короткий опис послуги (необов'язково)"
                    rows="3"
                    className="md:col-span-2 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={serviceSaving}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                    >
                      {serviceSaving ? 'Збереження...' : serviceEditingId ? 'Оновити послугу' : 'Додати послугу'}
                    </button>
                    {serviceEditingId && (
                      <button
                        type="button"
                        onClick={resetServiceForm}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
                      >
                        Скасувати редагування
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {sortedExtraServices.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Ще не додано жодної додаткової послуги. Наприклад: доставка, мийка, монтаж.
                    </div>
                  ) : (
                    sortedExtraServices.map((service) => (
                      <div key={service.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-200 rounded-2xl p-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{service.name}</p>
                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${service.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {service.active !== false ? 'Активна' : 'Прихована'}
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-sm text-slate-500 mt-1">{service.description}</p>
                          )}
                          <p className="text-sm text-slate-700 mt-1">
                            <span className="font-semibold">{Number(service.price || 0).toFixed(0)} ₴</span>
                            {' • '}
                            {service.billingType === 'per_day' ? 'за добу оренди' : 'фіксована вартість'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditService(service)}
                            className="px-3 py-2 bg-blue-100 text-blue-600 rounded-xl font-semibold hover:bg-blue-200 transition flex items-center gap-2 text-sm"
                          >
                            <Edit size={14} />
                            Редагувати
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition flex items-center gap-2 text-sm"
                          >
                            <Trash2 size={14} />
                            Видалити
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warehouse Tab */}
        {adminTab === 'warehouse' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Склад</h2>
                  <p className="text-sm text-slate-500 mt-1">Кладовщик бачить, що потрібно підготувати або прийняти на повернення на вибрану дату.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setWarehouseMode('packing')}
                    className={`px-4 py-2 rounded-xl font-semibold transition ${warehouseMode === 'packing' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    На складання
                  </button>
                  <button
                    onClick={() => setWarehouseMode('returns')}
                    className={`px-4 py-2 rounded-xl font-semibold transition ${warehouseMode === 'returns' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Повернення
                  </button>
                  <input
                    type="date"
                    value={warehouseDate}
                    onChange={(e) => setWarehouseDate(e.target.value)}
                    className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-5">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Замовлень на дату</p>
                  <p className="text-3xl font-bold text-slate-900">{warehouseSummary.orders}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Позицій</p>
                  <p className="text-3xl font-bold text-slate-900">{warehouseSummary.items}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Всього одиниць</p>
                  <p className="text-3xl font-bold text-slate-900">{warehouseSummary.units}</p>
                </div>
              </div>
            </div>

            {warehouseOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-slate-600 text-lg">На цю дату немає замовлень для складу</p>
                <p className="text-sm text-slate-500 mt-2">Спробуй іншу дату або переключи режим між складанням та поверненнями.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {warehouseOrders.map((order) => {
                  const draftItems = getWarehouseDraftItems(order);
                  const fullyPacked = draftItems.every((item) => Number(item.packedQuantity || 0) >= Number(item.quantity || 0));
                  const fullyReturned = draftItems.every((item) => Number(item.returnedQuantity || 0) + Number(item.brokenQuantity || 0) >= Number(item.quantity || 0));
                  const cardLabel = warehouseMode === 'returns'
                    ? (fullyReturned ? 'Повернення прийнято' : 'Чекає повернення')
                    : (fullyPacked ? 'Зібрано' : 'На складання');
                  const badgeClasses = warehouseMode === 'returns'
                    ? (fullyReturned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                    : (fullyPacked ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700');

                  return (
                    <div key={`warehouse-${order.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div
                        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50 transition select-none"
                        onClick={() => setExpandedWarehouseId(expandedWarehouseId === order.id ? null : order.id)}
                      >
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">Замовлення #{order.id?.slice(0, 8)}</h3>
                          <p className="text-slate-600 text-sm">{formatCustomerName(order)} • {formatDateRange(order.eventDate, order.eventEndDate)}</p>
                          <p className="text-slate-500 text-xs">{order.customerPhone || order.customerEmail || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClasses}`}>{cardLabel}</span>
                          <span className="text-xl font-bold text-slate-900">{order.totalPrice} ₴</span>
                          <ChevronDown className={`transition-transform duration-200 text-slate-400 ${expandedWarehouseId === order.id ? 'rotate-180' : ''}`} size={20} />
                        </div>
                      </div>

                      {expandedWarehouseId === order.id && (
                      <div className="px-5 pb-5">
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Назва</th>
                              <th className="text-center py-2 px-2 font-semibold text-slate-700 w-24">Замовлено</th>
                              <th className="text-center py-2 px-2 font-semibold text-slate-700 w-24">Зібрано</th>
                              <th className="text-center py-2 px-2 font-semibold text-slate-700 w-24">Повернено</th>
                              <th className="text-center py-2 px-2 font-semibold text-slate-700 w-24">Бій</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draftItems.map((item, idx) => {
                              const productImg = item.image || products.find(p => p.id === item.productId)?.image || '';
                              return (
                              <tr key={`${order.id}-warehouse-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                <td className="py-2 px-2">
                                  <div className="flex items-center gap-3">
                                    {productImg ? (
                                      <div
                                        className="shrink-0 cursor-zoom-in"
                                        onMouseEnter={(e) => {
                                          const r = e.currentTarget.getBoundingClientRect();
                                          setZoomImg({ src: productImg, x: r.right + 10, y: r.top });
                                        }}
                                        onMouseLeave={() => setZoomImg(null)}
                                        onClick={(e) => {
                                          const r = e.currentTarget.getBoundingClientRect();
                                          setZoomImg(v => v ? null : { src: productImg, x: r.right + 10, y: r.top });
                                        }}
                                      >
                                        <img
                                          src={productImg}
                                          alt={item.productName}
                                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 text-xs">?</div>
                                    )}
                                    <div>
                                      <div className="font-medium text-slate-900">{item.productName}</div>
                                      <div className="text-xs text-slate-500">{item.sku || 'Без артикулу'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center font-semibold text-slate-700">{item.quantity}</td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={item.packedQuantity}
                                    onChange={(e) => updateEditingOrderItem(order.id, idx, 'packedQuantity', e.target.value)}
                                    className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={item.returnedQuantity}
                                    onChange={(e) => updateEditingOrderItem(order.id, idx, 'returnedQuantity', e.target.value)}
                                    className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={item.brokenQuantity}
                                    onChange={(e) => updateEditingOrderItem(order.id, idx, 'brokenQuantity', e.target.value)}
                                    className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                                  />
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                        {warehouseMode === 'packing' ? (
                          <button
                            type="button"
                            onClick={() => applyWarehouseBulkAction(order, 'packedQuantity')}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
                          >
                            Позначити все зібраним
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => applyWarehouseBulkAction(order, 'returnedQuantity')}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
                          >
                            Позначити все поверненим
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveOrderItems(order)}
                          disabled={savingOrderEdits[order.id]}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition text-sm disabled:opacity-60"
                        >
                          {savingOrderEdits[order.id] ? 'Збереження...' : 'Зберегти складські зміни'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminTab('orders');
                            setLocalExpandedOrderId(order.id);
                          }}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition text-sm"
                        >
                          Відкрити в замовленнях
                        </button>
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })}
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
                    <option value="in_progress">В роботі</option>
                  <option value="confirmed">Підтверджено</option>
                  <option value="delivered">Доставлено</option>
                  <option value="cancelled">Скасовано</option>
                </select>

                <select
                  value={orderManagerFilter}
                  onChange={(e) => setOrderManagerFilter(e.target.value)}
                  className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="all">Всі менеджери</option>
                  {Array.from(new Set(orders.filter(o => o.assignedManagerId).map(o => JSON.stringify({ id: o.assignedManagerId, name: o.assignedManagerName }))))
                    .map(str => JSON.parse(str))
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                </select>

                <DateRangePicker
                  value={{ start: orderDateFilter.start, end: orderDateFilter.end }}
                  onChange={(dateRange) => setOrderDateFilter({ start: dateRange.start, end: dateRange.end })}
                />
                {(orderStatusFilter !== 'all' || orderManagerFilter !== 'all' || orderDateFilter.start || orderDateFilter.end) && (
                  <button
                    onClick={() => {
                      setOrderStatusFilter('all');
                      setOrderManagerFilter('all');
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
                <div key={order.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 ${localExpandedOrderId === order.id ? 'border-slate-200' : 'border-blue-200 hover:border-blue-300'}`}>
                  {/* Compacted Order Header */}
                  <button
                    onClick={() => setLocalExpandedOrderId(localExpandedOrderId === order.id ? null : order.id)}
                    className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition text-left"
                  >
                    <div className="flex-1 flex items-center gap-6">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg mb-1">
                          Замовлення #{order.id?.slice(0, 8)}
                        </h3>
                        <p className="text-slate-600 text-sm">
                          {formatCustomerName(order)} • {formatDateRange(order.eventDate, order.eventEndDate)}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {order.customerPhone || order.customerEmail || '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentStatusColor(order.paymentMethod, order.paymentStatus)}`}>
                            {getPaymentStatusLabel(order.paymentMethod, order.paymentStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{order.totalPrice} ₴</p>
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`ml-4 transition-transform ${localExpandedOrderId === order.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Horizontal Action Buttons (always visible) */}
                  <div className="px-6 pb-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    {/* Manager Assignment */}
                    {order.assignedManagerId ? (
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold text-sm flex items-center gap-2">
                        <UserCheck size={16} />
                        {order.assignedManagerName || 'Призначено'}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignToMe(order.id);
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-semibold hover:bg-blue-200 transition-colors flex items-center gap-2 text-sm"
                      >
                        <UserCheck size={16} />
                        Взяти в роботу
                      </button>
                    )}
                    
                    <select
                      value={order.status}
                      disabled={!order.assignedManagerId}
                      title={!order.assignedManagerId ? 'Призначте менеджера перед зміною статусу' : ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateOrderStatus(order, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-4 py-2 border-2 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all text-sm ${getStatusColor(order.status)} ${!order.assignedManagerId ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <option value="pending" disabled={order.status !== 'pending'}>Очікування</option>
                      <option value="in_progress">В роботі</option>
                      <option value="confirmed">Підтверджено</option>
                      <option value="delivered">Доставлено</option>
                      <option value="cancelled">Скасовано</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editingOrderItems[order.id]) {
                          cancelEditingOrderItems(order.id);
                        } else {
                          startEditingOrderItems(order);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm ${editingOrderItems[order.id] ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      <Edit size={16} />
                      {editingOrderItems[order.id] ? 'Скасувати зміни' : 'Редагувати замовлення'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadInvoice(order);
                      }}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Download size={16} />
                      PDF накладна
                    </button>
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
                  {localExpandedOrderId === order.id && (
                    <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Клієнт:</span> {formatCustomerName(order)}
                          </p>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Email:</span> {order.customerEmail}
                          </p>
                          <p className="text-slate-600 text-sm">
                            <span className="font-semibold">Телефон:</span> {order.customerPhone || '—'}
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
                        <h4 className="font-semibold text-slate-900 mb-3 text-sm">Товари (оренда на {calculateRentalDays(order.eventDate, order.eventEndDate)} днів):</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-2 font-semibold text-slate-700 w-16">Артикул</th>
                                <th className="text-left py-2 px-2 font-semibold text-slate-700">Назва</th>
                                <th className="text-center py-2 px-2 font-semibold text-slate-700 w-12">Кіл-сть</th>
                                <th className="text-right py-2 px-2 font-semibold text-slate-700 w-20">Ціна/день</th>
                                <th className="text-center py-2 px-2 font-semibold text-slate-700 w-10">Дні</th>
                                <th className="text-right py-2 px-2 font-semibold text-slate-700 w-20">Сума</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items?.map((item, idx) => {
                                const rentalDays = calculateRentalDays(order.eventDate, order.eventEndDate);
                                const itemTotal = item.price * item.quantity * rentalDays;
                                return (
                                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-100 transition">
                                    <td className="py-2 px-2 text-slate-600 text-xs font-mono">{item.sku || '—'}</td>
                                    <td className="py-2 px-2 text-slate-900">{item.productName}</td>
                                    <td className="py-2 px-2 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-2 px-2 text-right text-slate-600">{item.price} ₴</td>
                                    <td className="py-2 px-2 text-center text-slate-600 font-semibold">{rentalDays}</td>
                                    <td className="py-2 px-2 text-right font-semibold text-slate-900">{itemTotal.toFixed(0)} ₴</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {editingOrderItems[order.id] && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-slate-900 text-sm">Редагування складу замовлення</h4>
                              <p className="text-xs text-slate-500">Можна змінити кількість, замінити товар або додати нову позицію.</p>
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              Нова сума: {(
                                calculateItemsSubtotal(
                                  editingOrderItems[order.id],
                                  order.rentalDays || calculateRentalDays(order.eventDate, order.eventEndDate)
                                ) + (editingOrderServices[order.id] || []).reduce((sum, service) => {
                                  const rentalDays = order.rentalDays || calculateRentalDays(order.eventDate, order.eventEndDate);
                                  const price = Number(service.price || 0);
                                  return sum + (service.billingType === 'per_day' ? price * rentalDays : price);
                                }, 0)
                              ).toFixed(0)} ₴
                            </div>
                          </div>

                          <div className="space-y-3">
                            {editingOrderItems[order.id].map((item, idx) => (
                              <div key={`${order.id}-edit-${idx}`} className="grid md:grid-cols-[2fr_100px_120px_auto] gap-2 items-center bg-white border border-slate-200 rounded-xl p-3">
                                <select
                                  value={item.productId || ''}
                                  onChange={(e) => updateEditingOrderItem(order.id, idx, 'productId', e.target.value)}
                                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="">Оберіть товар</option>
                                  {products.map((productOption) => (
                                    <option key={productOption.id} value={productOption.id}>
                                      {productOption.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateEditingOrderItem(order.id, idx, 'quantity', e.target.value)}
                                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  placeholder="К-сть"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.price}
                                  onChange={(e) => updateEditingOrderItem(order.id, idx, 'price', e.target.value)}
                                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  placeholder="Ціна"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOrderItemRow(order.id, idx)}
                                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition text-sm"
                                >
                                  Видалити
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-blue-200 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h5 className="font-semibold text-slate-900 text-sm">Редагування додаткових послуг</h5>
                                <p className="text-xs text-slate-500">Можна додати, прибрати або змінити вартість послуги.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addOrderServiceRow(order.id)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
                              >
                                + Додати послугу
                              </button>
                            </div>

                            {(editingOrderServices[order.id] || []).length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                                У цьому замовленні ще немає додаткових послуг.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {editingOrderServices[order.id].map((service, idx) => (
                                  <div key={`${order.id}-service-${idx}`} className="grid md:grid-cols-[2fr_1fr_120px_auto] gap-2 items-center bg-white border border-slate-200 rounded-xl p-3">
                                    <select
                                      value={service.serviceId || ''}
                                      onChange={(e) => updateEditingOrderService(order.id, idx, 'serviceId', e.target.value)}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                      <option value="">Оберіть послугу</option>
                                      {sortedExtraServices.map((serviceOption) => (
                                        <option key={serviceOption.id} value={serviceOption.id}>
                                          {serviceOption.name}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={service.billingType || 'fixed'}
                                      onChange={(e) => updateEditingOrderService(order.id, idx, 'billingType', e.target.value)}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                      <option value="fixed">Фіксована</option>
                                      <option value="per_day">За добу</option>
                                    </select>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={service.price}
                                      onChange={(e) => updateEditingOrderService(order.id, idx, 'price', e.target.value)}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      placeholder="Ціна"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeOrderServiceRow(order.id, idx)}
                                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition text-sm"
                                    >
                                      Видалити
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => addOrderItemRow(order.id)}
                              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
                            >
                              + Додати позицію
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveOrderItems(order)}
                              disabled={savingOrderEdits[order.id]}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition text-sm disabled:opacity-60"
                            >
                              {savingOrderEdits[order.id] ? 'Збереження...' : 'Зберегти зміни'}
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEditingOrderItems(order.id)}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition text-sm"
                            >
                              Скасувати
                            </button>
                          </div>
                        </div>
                      )}

                      {!editingOrderItems[order.id] && order.extraServices?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                          <h4 className="font-semibold text-slate-900 mb-3 text-sm">Додаткові послуги:</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-2 font-semibold text-slate-700">Послуга</th>
                                  <th className="text-left py-2 px-2 font-semibold text-slate-700">Тип</th>
                                  <th className="text-right py-2 px-2 font-semibold text-slate-700 w-24">Ціна</th>
                                  <th className="text-right py-2 px-2 font-semibold text-slate-700 w-24">Сума</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.extraServices.map((service, idx) => {
                                  const rentalDays = order.rentalDays || calculateRentalDays(order.eventDate, order.eventEndDate);
                                  const total = Number(service.total ?? service.price ?? 0);
                                  return (
                                    <tr key={`${service.serviceId || service.name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-100 transition">
                                      <td className="py-2 px-2 text-slate-900 font-medium">
                                        {service.name}
                                        {service.description && (
                                          <div className="text-xs text-slate-500 mt-0.5">{service.description}</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-slate-600">
                                        {service.billingType === 'per_day'
                                          ? `${Number(service.price || 0).toFixed(0)} ₴ × ${rentalDays} дн.`
                                          : 'Фіксована ціна'}
                                      </td>
                                      <td className="py-2 px-2 text-right text-slate-600">{Number(service.price || 0).toFixed(0)} ₴</td>
                                      <td className="py-2 px-2 text-right font-semibold text-slate-900">{total.toFixed(0)} ₴</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Manager Notes */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm">📝 Приватні нотатки менеджера</h4>
                          {notesSaved[order.id] && !savingNotes[order.id] && (
                            <span className="text-xs font-semibold text-emerald-600">Збережено</span>
                          )}
                        </div>
                        <textarea
                          value={editingOrderNotes[order.id] ?? order.managerNotes ?? ''}
                          onChange={(e) => {
                            setNotesSaved((prev) => ({ ...prev, [order.id]: false }));
                            setEditingOrderNotes((prev) => ({ ...prev, [order.id]: e.target.value }));
                          }}
                          placeholder="Додайте приватні замітки (видимі тільки для менеджерів)..."
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition"
                          rows="3"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveManagerNotes(order.id);
                          }}
                          disabled={savingNotes[order.id]}
                          className="mt-3 px-4 py-2 bg-[#C5A059] text-white rounded-xl font-semibold hover:bg-[#b2904f] transition-colors text-sm disabled:opacity-60"
                        >
                          {savingNotes[order.id] ? 'Збереження...' : 'Зберегти нотатки'}
                        </button>
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
          <div className="space-y-6">
            {(() => { console.log('DEBUG: analyticsSubTab =', analyticsSubTab); return null; })()}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              {/* Date Filter */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Фільтр по датах</h3>
                  {analyticsDateRange.start && (
                    <button
                      onClick={() => {
                        setAnalyticsDateRange({ start: null, end: null });
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Скинути фільтр
                    </button>
                  )}
                </div>
                <DateRangePicker
                  value={analyticsDateRange}
                  onChange={setAnalyticsDateRange}
                />
                {analyticsDateRange.start && (
                  <p className="text-sm text-slate-600 mt-2">
                    Період: {analyticsDateRange.start.day}.{analyticsDateRange.start.month + 1}.{analyticsDateRange.start.year} 
                    {analyticsDateRange.end && ` - ${analyticsDateRange.end.day}.${analyticsDateRange.end.month + 1}.${analyticsDateRange.end.year}`}
                  </p>
                )}
              </div>

              {/* Manager Filter */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Фільтр по менеджерам</h3>
                <select
                  value={analyticsManagerFilter}
                  onChange={(e) => setAnalyticsManagerFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:border-slate-400"
                >
                  <option value="all">Всі менеджери</option>
                  {stats.managerStats?.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Analytics Sub-Tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-sm flex w-full gap-2">
              <button
                onClick={() => setAnalyticsSubTab('sales')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${analyticsSubTab === 'sales' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Продажі
              </button>
              <button
                onClick={() => setAnalyticsSubTab('customers')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${analyticsSubTab === 'customers' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Користувачі
              </button>
              <button
                onClick={() => setAnalyticsSubTab('products')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${analyticsSubTab === 'products' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Товари
              </button>
            </div>

            {(() => { console.log('DEBUG: rendering sub-tabs, analyticsSubTab =', analyticsSubTab, 'stats.topProducts =', stats?.topProducts?.length); return null; })()}

            {analyticsSubTab === 'sales' && (
            <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-sm text-white">
                <h3 className="text-blue-100 font-semibold mb-2 text-sm">Загальна виручка</h3>
                <p className="text-3xl font-bold">{stats.totalRevenue?.toLocaleString()} ₴</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-sm text-white">
                <h3 className="text-green-100 font-semibold mb-2 text-sm">Всього замовлень</h3>
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-sm text-white">
                <h3 className="text-purple-100 font-semibold mb-2 text-sm">Середній чек</h3>
                <p className="text-3xl font-bold">{stats.averageOrderValue?.toFixed(0)} ₴</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-sm text-white">
                <h3 className="text-orange-100 font-semibold mb-2 text-sm">Конверсія</h3>
                <p className="text-3xl font-bold">
                  {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Статус замовлень</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span className="text-slate-700">Очікування</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{stats.pendingOrders}</span>
                      <span className="text-xs text-slate-500">
                        ({stats.totalOrders > 0 ? Math.round((stats.pendingOrders / stats.totalOrders) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-slate-700">Підтверджено</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{stats.confirmedOrders}</span>
                      <span className="text-xs text-slate-500">
                        ({stats.totalOrders > 0 ? Math.round((stats.confirmedOrders / stats.totalOrders) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOrders > 0 ? (stats.confirmedOrders / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-slate-700">Завершено</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{stats.completedOrders}</span>
                      <span className="text-xs text-slate-500">
                        ({stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-slate-700">Скасовано</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{stats.cancelledOrders}</span>
                      <span className="text-xs text-slate-500">
                        ({stats.totalOrders > 0 ? Math.round((stats.cancelledOrders / stats.totalOrders) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOrders > 0 ? (stats.cancelledOrders / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Revenue Chart (simplified bars) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Виручка по днях</h3>
                {stats.revenueByDate && Object.keys(stats.revenueByDate).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.revenueByDate)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .slice(-7)
                      .map(([date, revenue]) => {
                        const maxRevenue = Math.max(...Object.values(stats.revenueByDate));
                        const percentage = (revenue / maxRevenue) * 100;
                        const dateObj = new Date(date);
                        const formattedDate = `${dateObj.getDate()}.${dateObj.getMonth() + 1}`;
                        return (
                          <div key={date} className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 w-12">{formattedDate}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                <span className="text-xs font-bold text-white">{revenue.toFixed(0)} ₴</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Немає даних</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Топ-10 товарів за виручкою</h3>
              {stats.topProducts && stats.topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Товар</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Виручка</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Замовлень</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">К-ть</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topProducts.map((product, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{product.name}</td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-slate-900">{product.revenue.toFixed(0)} ₴</td>
                          <td className="py-3 px-4 text-sm text-right text-slate-600">{product.count}</td>
                          <td className="py-3 px-4 text-sm text-right text-slate-600">{product.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">Немає даних</p>
              )}
            </div>

            {/* Category Revenue */}
            {stats.categoryRevenue && Object.keys(stats.categoryRevenue).length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Виручка по категоріях</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(stats.categoryRevenue)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, revenue]) => (
                      <div key={category} className="bg-slate-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-1">{category}</h4>
                        <p className="text-2xl font-bold text-slate-900">{revenue.toFixed(0)} ₴</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {stats.totalRevenue > 0 ? ((revenue / stats.totalRevenue) * 100).toFixed(1) : 0}% від загальної
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}



            {/* Manager Performance */}
            {stats.managerStats && stats.managerStats.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Ефективність менеджерів</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Менеджер</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Замовлень</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Завершено</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Виручка</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Середній чек</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Конверсія</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.managerStats.map((manager) => {
                        const avgCheck = manager.totalOrders > 0 ? manager.revenue / manager.totalOrders : 0;
                        const conversionRate = manager.totalOrders > 0 ? (manager.completedOrders / manager.totalOrders) * 100 : 0;
                        return (
                          <tr key={manager.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm font-medium text-slate-900">{manager.name}</td>
                            <td className="py-3 px-4 text-sm text-right text-slate-600">{manager.totalOrders}</td>
                            <td className="py-3 px-4 text-sm text-right text-slate-600">{manager.completedOrders}</td>
                            <td className="py-3 px-4 text-sm text-right font-bold text-slate-900">{manager.revenue.toFixed(0)} ₴</td>
                            <td className="py-3 px-4 text-sm text-right text-slate-600">{avgCheck.toFixed(0)} ₴</td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                conversionRate >= 70 ? 'bg-green-100 text-green-700' : 
                                conversionRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {conversionRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </>
            )}

            {analyticsSubTab === 'products' && (
              <>
                {(() => {
                  // Агрегація по товарах з orders
                  const productAgg = {};
                  const orderSeenPerProduct = {};
                  (stats.orders || []).forEach(o => {
                    (o.items || []).forEach(item => {
                      const pid = item.productId || item.productName || item.name;
                      if (!pid) return;
                      if (!productAgg[pid]) {
                        productAgg[pid] = {
                          productId: item.productId || null,
                          name: item.productName || item.name || 'Товар',
                          category: item.category || 'Інше',
                          revenue: 0,
                          quantity: 0,
                          orders: 0,
                        };
                        orderSeenPerProduct[pid] = new Set();
                      }
                      productAgg[pid].revenue += (item.price || 0) * (item.quantity || 0);
                      productAgg[pid].quantity += (item.quantity || 0);
                      if (!orderSeenPerProduct[pid].has(o.id)) {
                        orderSeenPerProduct[pid].add(o.id);
                        productAgg[pid].orders += 1;
                      }
                    });
                  });

                  // Збагачуємо даними товарів (sku, залишок)
                  const productMap = {};
                  (analyticsProducts || []).forEach(p => {
                    productMap[p.id] = p;
                  });
                  let rows = Object.values(productAgg).map(r => {
                    const p = r.productId ? (productMap[r.productId] || {}) : {};
                    const avgPrice = r.quantity > 0 ? r.revenue / r.quantity : 0;
                    return {
                      ...r,
                      sku: p.sku || '',
                      stock: p.quantity ?? '-',
                      avgPrice,
                    };
                  }).sort((a,b) => b.revenue - a.revenue);

                  // Fallback: build rows from topProducts when no orders matched
                  if (rows.length === 0 && Array.isArray(stats.topProducts) && stats.topProducts.length > 0) {
                    rows = stats.topProducts.map(tp => ({
                      productId: null,
                      name: tp.name,
                      category: '—',
                      revenue: tp.revenue || 0,
                      quantity: tp.quantity || 0,
                      orders: tp.count || 0,
                      sku: '',
                      stock: '-',
                      avgPrice: (tp.quantity && tp.quantity > 0) ? (tp.revenue / tp.quantity) : 0,
                    })).sort((a,b) => b.revenue - a.revenue);
                  }

                  // ABC класифікація по виручці
                  const totalRev = rows.reduce((s,r)=>s+r.revenue,0) || 1;
                  let cumulative = 0;
                  rows.forEach(r => {
                    cumulative += r.revenue;
                    const share = (cumulative / totalRev) * 100;
                    r.abc = share <= 80 ? 'A' : share <= 95 ? 'B' : 'C';
                  });

                  // Метрики
                  const productsWithSales = rows.length;
                  const zeroSales = (analyticsProducts || []).filter(p => !productAgg[p.id]);
                  const totalQty = rows.reduce((s,r)=>s+r.quantity,0);
                  const avgPriceSold = totalQty > 0 ? (totalRev / totalQty) : 0;

                  console.log('DEBUG: productsWithSales =', productsWithSales);
                  console.log('DEBUG: zeroSales =', zeroSales);
                  console.log('DEBUG: totalQty =', totalQty);

                  return (
                    <>
                      {/* Metrics */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-blue-100 font-semibold mb-2 text-sm">Товарів з продажами</h3>
                          <p className="text-3xl font-bold">{productsWithSales}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-red-100 font-semibold mb-2 text-sm">Без продажів</h3>
                          <p className="text-3xl font-bold">{zeroSales.length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-purple-100 font-semibold mb-2 text-sm">Продано одиниць</h3>
                          <p className="text-3xl font-bold">{totalQty}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-orange-100 font-semibold mb-2 text-sm">Сер. ціна продажу</h3>
                          <p className="text-3xl font-bold">{avgPriceSold.toFixed(0)} ₴</p>
                        </div>
                      </div>

                      {/* Product Performance Table */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-slate-900">Ефективність товарів</h3>
                          <p className="text-sm text-slate-500">Класи ABC за кумулятивною виручкою</p>
                        </div>
                        {rows.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Товар</th>
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Категорія</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">К-ть</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Замовлень</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Виручка</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Сер. ціна</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Залишок</th>
                                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">ABC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.slice(0, 50).map(r => (
                                  <tr key={r.productId} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm text-slate-600">{r.sku || '—'}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{r.name}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{r.category}</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-600">{r.quantity}</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-600">{r.orders}</td>
                                    <td className="py-3 px-4 text-sm text-right font-bold text-slate-900">{r.revenue.toFixed(0)} ₴</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-600">{r.avgPrice.toFixed(0)} ₴</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-600">{r.stock}</td>
                                    <td className="py-3 px-4 text-sm text-center">
                                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                        r.abc === 'A' ? 'bg-green-100 text-green-700' : r.abc === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                                      }`}>{r.abc}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">Немає даних</p>
                        )}
                      </div>

                      {/* Zero Sales Products */}
                      {zeroSales.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                          <h3 className="text-xl font-bold text-slate-900 mb-4">Товари без продажів</h3>
                          <div className="grid md:grid-cols-3 gap-3">
                            {zeroSales.slice(0, 18).map(p => (
                              <div key={p.id} className="bg-slate-50 rounded-xl p-4">
                                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                                <div className="text-xs text-slate-600">SKU: {p.sku || '—'} • Категорія: {p.category || '—'}</div>
                                <div className="text-xs text-slate-600 mt-1">Залишок: {p.quantity ?? '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {analyticsSubTab === 'customers' && (
              <>
                {/* Customers Key Metrics */}
                {(() => {
                  const customerMap = {};
                  (stats.orders || []).forEach(o => {
                    const key = o.userId || o.customerEmail || o.customerPhone;
                    if (!key) return;
                    const displayName = (o.customerName && o.customerName.trim())
                      || (o.customerEmail ? o.customerEmail.split('@')[0] : '')
                      || o.customerPhone
                      || 'Клієнт';

                    if (!customerMap[key]) {
                      customerMap[key] = {
                        id: key,
                        name: displayName,
                        email: o.customerEmail || '',
                        phone: o.customerPhone || '',
                        orders: 0,
                        revenue: 0,
                        lastOrderAt: null,
                      };
                    }
                    customerMap[key].orders += 1;
                    customerMap[key].revenue += o.totalPrice || 0;
                    const d = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : null);
                    if (d && (!customerMap[key].lastOrderAt || d > customerMap[key].lastOrderAt)) {
                      customerMap[key].lastOrderAt = d;
                    }
                  });
                  const customers = Object.values(customerMap).sort((a,b) => b.revenue - a.revenue);
                  const uniqueCustomers = customers.length;
                  const repeatCustomers = customers.filter(c => c.orders > 1).length;
                  const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
                  const avgOrdersPerCustomer = uniqueCustomers > 0 ? (stats.totalOrders / uniqueCustomers) : 0;
                  const avgRevenuePerCustomer = uniqueCustomers > 0 ? (stats.totalRevenue / uniqueCustomers) : 0;

                  return (
                    <>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-blue-100 font-semibold mb-2 text-sm">Унікальні клієнти</h3>
                          <p className="text-3xl font-bold">{uniqueCustomers}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-green-100 font-semibold mb-2 text-sm">Повторні клієнти</h3>
                          <p className="text-3xl font-bold">{repeatCustomers}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-purple-100 font-semibold mb-2 text-sm">Повторна частка</h3>
                          <p className="text-3xl font-bold">{repeatRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-sm text-white">
                          <h3 className="text-orange-100 font-semibold mb-2 text-sm">Сер. дохід на клієнта</h3>
                          <p className="text-3xl font-bold">{avgRevenuePerCustomer.toFixed(0)} ₴</p>
                        </div>
                      </div>

                      {/* Top Customers Table */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-slate-900">Топ клієнтів</h3>
                          <p className="text-sm text-slate-500">Сер. замовлень/клієнта: {avgOrdersPerCustomer.toFixed(2)}</p>
                        </div>
                        {customers.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Клієнт</th>
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Телефон</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Замовлень</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Виручка</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Сер. чек</th>
                                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Останнє</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customers.slice(0, 20).map((c, idx) => {
                                  const avg = c.orders > 0 ? c.revenue / c.orders : 0;
                                  const dateStr = c.lastOrderAt ? `${c.lastOrderAt.getDate()}.${c.lastOrderAt.getMonth()+1}.${c.lastOrderAt.getFullYear()}` : '—';
                                  return (
                                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-3 px-4 text-sm text-slate-600">{idx + 1}</td>
                                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{c.name}</td>
                                      <td className="py-3 px-4 text-sm text-slate-600">{c.email || '—'}</td>
                                      <td className="py-3 px-4 text-sm text-slate-600">{c.phone || '—'}</td>
                                      <td className="py-3 px-4 text-sm text-right text-slate-600">{c.orders}</td>
                                      <td className="py-3 px-4 text-sm text-right font-bold text-slate-900">{c.revenue.toFixed(0)} ₴</td>
                                      <td className="py-3 px-4 text-sm text-right text-slate-600">{avg.toFixed(0)} ₴</td>
                                      <td className="py-3 px-4 text-sm text-right text-slate-600">{dateStr}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">Немає даних</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {adminTab === 'settings' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">Налаштування</h2>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-4 mb-4">
                <div>
                  <p className="font-semibold text-slate-900">Звук нових замовлень</p>
                  <p className="text-sm text-slate-500">Дзвінок поки вкладка відкрита</p>
                </div>
                <button
                  onClick={toggleSound}
                  className={`w-14 h-8 rounded-full p-1 flex items-center transition ${soundEnabled ? 'bg-slate-900' : 'bg-slate-300'}`}
                  aria-label="Toggle sound"
                >
                  <span className={`bg-white w-6 h-6 rounded-full shadow transform transition ${soundEnabled ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>

              {/* Sound Type Selection (Collapsible) */}
              <button
                onClick={() => setExpandSoundType(!expandSoundType)}
                className="w-full flex items-center justify-between border border-slate-100 rounded-xl p-4 mb-4 hover:bg-slate-50 transition"
              >
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Тип звуку</p>
                  <p className="text-sm text-slate-500">
                    {soundType === 'bell' && '🔔 Дзвінок (м\'який)'}
                    {soundType === 'alarm' && '🚨 Сигнал (гучний)'}
                    {soundType === 'chime' && '🎵 Мелодія (двотональна)'}
                  </p>
                </div>
                <ChevronDown 
                  size={20} 
                  className={`text-slate-600 transition-transform ${expandSoundType ? 'rotate-180' : ''}`}
                />
              </button>

              {expandSoundType && (
                <div className="border border-slate-100 rounded-xl p-4 mb-4 bg-slate-50 space-y-2">
                  {[
                    { value: 'bell', label: '🔔 Дзвінок (м\'який)', desc: 'Приємний дзвін' },
                    { value: 'alarm', label: '🚨 Сигнал (гучний)', desc: 'Гучний тривожний звук' },
                    { value: 'chime', label: '🎵 Мелодія (двотональна)', desc: 'Музичні ноти' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition cursor-pointer">
                      <input
                        type="radio"
                        name="soundType"
                        value={option.value}
                        checked={soundType === option.value}
                        onChange={(e) => updateSoundType(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{option.label}</p>
                        <p className="text-xs text-slate-500">{option.desc}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          playSound(option.value);
                        }}
                        className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
                      >
                        Прослухай
                      </button>
                    </label>
                  ))}
                </div>
              )}

              {/* Push Notifications */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-4 mb-4">
                <div>
                  <p className="font-semibold text-slate-900">Push-сповіщення браузера</p>
                  <p className="text-sm text-slate-500">Отримувати коли вкладка закрита</p>
                </div>
                <button
                  onClick={togglePushNotifications}
                  className={`w-14 h-8 rounded-full p-1 flex items-center transition ${pushEnabled ? 'bg-slate-900' : 'bg-slate-300'}`}
                  aria-label="Toggle push notifications"
                >
                  <span className={`bg-white w-6 h-6 rounded-full shadow transform transition ${pushEnabled ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>

              <p className="text-xs text-slate-500">💡 In-app сповіщення показуються внизу справа панелі. Push-сповіщення приходять на пристрій, навіть коли браузер закритий (потребує дозвіл).</p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">LiqPay ключі</h3>
                  <p className="text-sm text-slate-500">Тут адміністратор може оновити `public_key`, `private_key`, sandbox-режим і базовий URL для callback.</p>
                </div>
                {paymentSettingsForm.updatedAt && (
                  <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">
                    Оновлено: {new Date(paymentSettingsForm.updatedAt).toLocaleString('uk-UA')}
                  </span>
                )}
              </div>

              {paymentSettingsLoading ? (
                <p className="text-sm text-slate-500">Завантаження налаштувань LiqPay...</p>
              ) : (
                <form onSubmit={handleSavePaymentSettings} className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={paymentSettingsForm.publicKey}
                    onChange={(e) => setPaymentSettingsForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                    placeholder="LiqPay public_key"
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <input
                    type="url"
                    value={paymentSettingsForm.appBaseUrl}
                    onChange={(e) => setPaymentSettingsForm((prev) => ({ ...prev, appBaseUrl: e.target.value }))}
                    placeholder="https://your-domain.example"
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <input
                    type="password"
                    value={paymentSettingsForm.privateKey}
                    onChange={(e) => setPaymentSettingsForm((prev) => ({ ...prev, privateKey: e.target.value }))}
                    placeholder={paymentSettingsForm.hasPrivateKey ? `Private key збережено: ${paymentSettingsForm.privateKeyPreview || '••••'}` : 'Встав новий LiqPay private_key'}
                    className="md:col-span-2 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <label className="md:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={paymentSettingsForm.sandbox}
                      onChange={(e) => setPaymentSettingsForm((prev) => ({ ...prev, sandbox: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    Увімкнути `LiqPay sandbox` для тестових оплат
                  </label>

                  <div className="md:col-span-2 flex flex-wrap gap-2 text-xs">
                    <span className={`px-3 py-1 rounded-full ${paymentSettingsForm.hasPublicKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {paymentSettingsForm.hasPublicKey ? 'Public key збережено' : 'Public key ще не задано'}
                    </span>
                    <span className={`px-3 py-1 rounded-full ${paymentSettingsForm.hasPrivateKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {paymentSettingsForm.hasPrivateKey ? 'Private key збережено на сервері' : 'Private key ще не задано'}
                    </span>
                  </div>

                  {paymentSettingsError && (
                    <p className="md:col-span-2 text-sm text-red-600">{paymentSettingsError}</p>
                  )}
                  {paymentSettingsMessage && (
                    <p className="md:col-span-2 text-sm text-emerald-600">{paymentSettingsMessage}</p>
                  )}

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={paymentSettingsSaving}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                    >
                      {paymentSettingsSaving ? 'Збереження...' : 'Зберегти LiqPay ключі'}
                    </button>
                    <button
                      type="button"
                      onClick={loadPaymentSettings}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
                    >
                      Оновити дані
                    </button>
                  </div>

                  <p className="md:col-span-2 text-xs text-slate-500">
                    Private key не показується повністю. Якщо залишиш це поле порожнім, збережений ключ не зміниться.
                  </p>
                </form>
              )}
            </div>

          </div>
        )}

        {/* Users Tab */}
        {adminTab === 'users' && (
          <UsersView />
        )}
      </div>

      {/* Zoom overlay for warehouse product images */}
      {zoomImg && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-2xl overflow-hidden border-2 border-slate-300 shadow-2xl"
          style={{ left: Math.min(zoomImg.x, window.innerWidth - 260), top: Math.max(8, Math.min(zoomImg.y, window.innerHeight - 260)), width: 240, height: 240 }}
        >
          <img src={zoomImg.src} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
