import { useState, useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import { getOrders } from '../services/firebase';
import { ChevronDown } from 'lucide-react';

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

const formatCustomerName = (order) => {
  if (!order) return 'Клієнт';
  if (order.customerName && order.customerName.trim()) return order.customerName.trim();
  if (order.customerEmail) return order.customerEmail.split('@')[0];
  if (order.customerPhone) return order.customerPhone;
  return 'Клієнт';
};

export function OrdersView() {
  const { currentUser, orders, setView } = useAppContext();
  const [expandedId, setExpandedId] = useState(null);
  const [localOrders, setLocalOrders] = useState(orders || []);

  // Перезавантажуємо замовлення при першому завантаженні сторінки або коли користувач змінився
  useEffect(() => {
    const loadOrders = async () => {
      if (currentUser?.uid) {
        try {
          const fetchedOrders = await getOrders({ userId: currentUser.uid });
          setLocalOrders(fetchedOrders || []);
        } catch (error) {
          console.error('Error reloading orders:', error);
          setLocalOrders(orders || []);
        }
      }
    };
    loadOrders();
  }, [currentUser?.uid, orders]);

  if (!localOrders || localOrders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">МОЇ ЗАМОВЛЕННЯ</h1>
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-slate-600 text-lg mb-6">У вас поки немає замовлень</p>
            <div className="text-xs text-gray-400 mb-4">
              <div>userId: {currentUser?.uid || '—'}</div>
              <div>email: {currentUser?.email || '—'}</div>
            </div>
            <button
              onClick={() => setView('home')}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
            >
              ← Повернутися на головну
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayedOrders = localOrders && localOrders.length > 0 ? localOrders : orders;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">МОЇ ЗАМОВЛЕННЯ</h1>

        <div className="space-y-4">
          {displayedOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Order Header */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === order.id ? null : order.id)
                }
                className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">
                      Замовлення #{order.id?.slice(0, 8)}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">
                    Дата: {order.createdAt?.toDate?.().toLocaleDateString('uk-UA') || 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {order.totalPrice} ₴
                    </p>
                  </div>
                  <ChevronDown
                    size={24}
                    className={`text-slate-600 transition ${
                      expandedId === order.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Order Details */}
              {expandedId === order.id && (
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                  <div className="grid md:grid-cols-2 gap-8 mb-6">
                    <div>
                      <h4 className="font-bold text-slate-900 mb-3">Клієнт</h4>
                      <p className="text-slate-600">{formatCustomerName(order)}</p>
                      <p className="text-slate-600">{order.customerEmail}</p>
                      <p className="text-slate-600">{order.customerPhone}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 mb-3">Доставка</h4>
                      <p className="text-slate-600">{order.address}</p>
                      <p className="text-slate-600 mt-2">
                        <span className="font-semibold">Дата заходу:</span>{' '}
                        {formatDateRange(order.eventDate, order.eventEndDate)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Товари (оренда на {calculateRentalDays(order.eventDate, order.eventEndDate)} днів)</h4>
                    <div className="bg-white rounded-xl p-4 overflow-x-auto">
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
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
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

                  {order.notes && (
                    <div className="mt-6">
                      <h4 className="font-bold text-slate-900 mb-2">Примітки</h4>
                      <p className="text-slate-600 bg-white rounded-xl p-4">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
