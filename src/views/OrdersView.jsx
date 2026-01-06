import { useState, useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import { ChevronDown } from 'lucide-react';

export function OrdersView() {
  const { currentUser, orders, setView } = useAppContext();
  const [expandedId, setExpandedId] = useState(null);

  if (!orders || orders.length === 0) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
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
          {orders.map((order) => (
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
                      <p className="text-slate-600">{order.customerName}</p>
                      <p className="text-slate-600">{order.customerEmail}</p>
                      <p className="text-slate-600">{order.customerPhone}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 mb-3">Доставка</h4>
                      <p className="text-slate-600">{order.address}</p>
                      <p className="text-slate-600 mt-2">
                        <span className="font-semibold">Дата заходу:</span>{' '}
                        {order.eventDate}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Товари</h4>
                    <div className="bg-white rounded-xl p-4 space-y-2">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-2 border-b border-slate-200 last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="text-sm text-slate-600">
                              Кількість: {item.quantity}
                            </p>
                          </div>
                          <p className="font-bold text-slate-900">
                            {item.price * item.quantity} ₴
                          </p>
                        </div>
                      ))}
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
