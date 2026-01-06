import React from "react";
import { Package, ClipboardList, Edit3, Trash2 } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";

export const AdminPanel = () => {
  const { adminTab, setAdminTab, setView, items, setItems, orders } = useAppContext();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <h1 className="text-5xl font-black italic uppercase mb-12 text-gray-900 border-b pb-8">⚙️ Адмін-панель</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-72 space-y-2">
          {[{ id: 'inventory', label: 'Склад товарів', icon: Package }, { id: 'orders', label: 'Замовлення', icon: ClipboardList }].map(t => (
            <button key={t.id} onClick={() => setAdminTab(t.id)} className={`w-full flex items-center gap-3 px-6 py-5 rounded-[32px] font-black uppercase text-[10px] transition-all ${adminTab === t.id ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}>
              <t.icon size={18}/> {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white rounded-[48px] border border-gray-100 p-10 min-h-[600px] shadow-xl">
          {adminTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black italic uppercase text-gray-900">Товари</h3>
                <button onClick={() => setView('post')} className="bg-[#C5A059] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase hover:bg-gray-900 transition-all shadow-lg">➕ Додати товар</button>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">Товарів не знайдено</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="p-5 bg-gray-50 rounded-[28px] flex justify-between items-center border border-gray-100 hover:border-[#C5A059] transition-all">
                      <div className="flex items-center gap-5">
                        <SafeImage src={item.image} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                        <div>
                          <p className="font-black text-sm uppercase text-gray-900">{item.title}</p>
                          <p className="text-[10px] text-[#C5A059] font-black uppercase mt-1">{item.price} ₴ • {item.count || '∞'} од</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2.5 text-red-500 hover:bg-red-50 rounded-full transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {adminTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-3xl font-black italic uppercase text-gray-900 mb-10">Замовлення</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">Замовлень не знайдено</p>
                ) : (
                  orders.map(o => (
                    <div key={o.id} className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-lg text-gray-900">{o.customer?.name || 'Анонім'}</h4>
                        <span className="font-black text-xl text-[#C5A059]">{o.total || 0} ₴</span>
                      </div>
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">{o.customer?.phone || '—'} | {o.customer?.address || '—'}</p>
                      <p className="text-[10px] font-bold uppercase text-gray-400 italic">{o.dates || o.date || 'Дата не вказана'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
