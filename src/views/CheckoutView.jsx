import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useAppContext } from "../context/useAppContext";

export const CheckoutView = () => {
  const {
    view,
    setView,
    bookingStatus,
    customerInfo,
    setCustomerInfo,
    handleOrderSubmit,
  } = useAppContext();

  if (view !== "checkout") return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12 text-gray-900 animate-in slide-in-from-bottom-8 duration-500">
      {bookingStatus === "success" ? (
        <div className="text-center py-20 bg-gray-900 rounded-[64px] shadow-2xl px-12">
          <CheckCircle2 size={64} className="mx-auto text-green-400 mb-8 animate-bounce" />
          <h2 className="text-4xl font-black italic mb-6 uppercase text-white">Замовлення прийнято!</h2>
          <p className="text-sm text-gray-400 mb-10 italic">Дякуємо за вашу довіру. Ми зв'яжемося з вами найскоріше.</p>
          <button onClick={() => setView('home')} className="w-full py-6 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-widest">← На головну</button>
        </div>
      ) : (
        <div className="bg-white rounded-[64px] shadow-2xl p-12 border border-gray-100">
          <h2 className="text-3xl font-black italic mb-10 uppercase border-b pb-8">Оформлення замовлення</h2>
          <form onSubmit={handleOrderSubmit} className="space-y-6">
            <input required className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Ім'я" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
            <input required className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Телефон" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
            <input required className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Адреса доставки" value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
            <button type="submit" className="w-full py-6 bg-gray-900 text-white font-black rounded-full uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-[#C5A059] transition-all">🛒 Оформити замовлення</button>
          </form>
        </div>
      )}
    </div>
  );
};
