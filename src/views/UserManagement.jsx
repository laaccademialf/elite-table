import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUser, deleteUser, getUserOrders } from '../services/firebase';

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedUserOrders, setSelectedUserOrders] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers.sort((a, b) => new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0)));
    } catch (err) {
      setError(err.message);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setEditData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
    });
  };

  const handleSave = async (userId) => {
    try {
      await updateUser(userId, editData);
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...editData } : u)));
      setEditingUserId(null);
      setEditData({});
    } catch (err) {
      setError(err.message);
      console.error('Error updating user:', err);
    }
  };

  // Зміна ролі тепер відбувається через редагування профілю (select у рядку)

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Видалити користувача ${userName}? Це неможливо буде відновити.`)) return;
    try {
      await deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setSelectedUserOrders(null);
      setExpandedUserId(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting user:', err);
    }
  };

  const handleShowOrders = async (userId, userName) => {
    try {
      console.log('[handleShowOrders] Loading orders for user:', userId);
      const orders = await getUserOrders(userId);
      console.log('[handleShowOrders] Orders loaded:', orders);
      setSelectedUserOrders({ userId, userName, orders });
    } catch (err) {
      console.error('[handleShowOrders] Error loading orders:', err);
      setError(err.message);
      // Show empty orders even if error
      setSelectedUserOrders({ userId, userName, orders: [] });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Завантаження користувачів...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Користувачи</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ім'я</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Телефон</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Роль</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Дата реєстрації</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Дії</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <React.Fragment key={user.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-900 font-semibold w-full"
                      />
                    ) : (
                      user.name || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-900 font-semibold w-full"
                      />
                    ) : (
                      user.phone || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={editData.role}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                        className="px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-900 font-semibold w-full"
                      >
                        <option value="customer">Користувач</option>
                        <option value="manager">Менеджер</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded text-white text-xs font-semibold ${
                          user.role === 'manager' ? 'bg-blue-600' : 'bg-gray-500'
                        }`}
                      >
                        {user.role === 'manager' ? 'Менеджер' : 'Користувач'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={() => handleSave(user.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                        >
                          Зберегти
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-3 py-1 bg-gray-500 text-white rounded text-xs font-semibold hover:bg-gray-600"
                        >
                          Скасувати
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (expandedUserId === user.id) {
                              setExpandedUserId(null);
                              setSelectedUserOrders(null);
                            } else {
                              handleShowOrders(user.id, user.name);
                              setExpandedUserId(user.id);
                            }
                          }}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-colors"
                        >
                          {expandedUserId === user.id ? 'Приховати' : 'Замовлення'}
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Редагувати
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                        >
                          Видалити
                        </button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>

                {expandedUserId === user.id && selectedUserOrders?.userId === user.id && (
                  <tr className="bg-gray-50">
                    <td colSpan="6" className="px-6 py-4">
                      <div className="bg-white p-4 rounded border border-gray-200">
                        <h3 className="font-semibold mb-4">
                          Замовлення користувача: {selectedUserOrders.userName || user.email}
                        </h3>
                        {selectedUserOrders.orders.length === 0 ? (
                          <p className="text-gray-500 text-sm">Немає замовлень</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedUserOrders.orders.map((order) => (
                              <div key={order.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="font-semibold">Замовлення ID:</span> {order.id}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Дата:</span> {formatDate(order.createdAt)}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Статус:</span>
                                    <span
                                      className={`ml-2 px-2 py-1 rounded text-xs font-semibold text-white ${
                                        order.status === 'pending'
                                          ? 'bg-yellow-500'
                                          : order.status === 'confirmed'
                                          ? 'bg-green-500'
                                          : order.status === 'delivered'
                                          ? 'bg-blue-500'
                                          : 'bg-red-500'
                                      }`}
                                    >
                                      {order.status === 'pending'
                                        ? 'Очікує'
                                        : order.status === 'confirmed'
                                        ? 'Підтверджено'
                                        : order.status === 'delivered'
                                        ? 'Доставлено'
                                        : 'Скасовано'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-semibold">Сума:</span> ₴{order.totalPrice?.toFixed(2) || '0.00'}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-semibold">Дата заходу:</span> {formatDate(order.eventDate)} —{' '}
                                    {formatDate(order.eventEndDate || order.eventDate)}
                                  </div>
                                  {order.items && (
                                    <div className="col-span-2">
                                      <span className="font-semibold">Товари:</span>
                                      <ul className="mt-1 list-disc list-inside text-xs">
                                        {order.items.map((item, idx) => (
                                          <li key={idx}>
                                            Продукт ID: {item.productId}, Кількість: {item.quantity}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center text-gray-500 py-8">Користувачів не знайдено</div>
      )}
    </div>
  );
};

export default UsersView;
