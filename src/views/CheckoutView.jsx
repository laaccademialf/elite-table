import React, { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { registerUserWithPhone, loginUser } from "../services/firebase";

export const CheckoutView = () => {
  const {
    view,
    setView,
    bookingStatus,
    customerInfo,
    setCustomerInfo,
    handleOrderSubmit,
    currentUser,
  } = useAppContext();

  const [autoRegError, setAutoRegError] = useState("");
  const [password, setPassword] = useState("");

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setAutoRegError("");

    // Якщо користувач не залогінений, але ввів email і пароль — пробуємо логін
    if (!currentUser && customerInfo.email && password) {
      try {
        await loginUser(customerInfo.email, password);
        await handleOrderSubmit(e);
        return;
      } catch (error) {
        setAutoRegError(error.message || "Помилка входу. Спробуйте ще раз або скористайтесь автозаповненням телефону.");
        return;
      }
    }

    // Якщо не залогінений і не ввів пароль — авто-реєстрація по телефону
    if (!currentUser) {
      try {
        const result = await registerUserWithPhone(customerInfo.phone, customerInfo.name);
        console.log("Auto-registered user:", result);
        await handleOrderSubmit(e);
      } catch (error) {
        setAutoRegError(error.message || "Помилка реєстрації. Спробуйте ще раз.");
        return;
      }
    } else {
      await handleOrderSubmit(e);
    }
  };

  if (view !== "checkout") return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12 text-gray-900 animate-in slide-in-from-bottom-8 duration-500">
      {bookingStatus === "success" ? (
        <div className="text-center py-20 bg-gray-900 rounded-[64px] shadow-2xl px-12">
          <CheckCircle2 size={64} className="mx-auto text-green-400 mb-8 animate-bounce" />
          <h2 className="text-4xl font-black italic mb-6 uppercase text-white">Замовлення прийнято!</h2>
          <p className="text-sm text-gray-400 mb-4 italic">Дякуємо за вашу довіру. Ми зв'яжемося з вами найскоріше.</p>
          {!currentUser && (
            <p className="text-xs text-gray-500 mb-10">
              <strong>Ваш облік створено:</strong> Email: {customerInfo.phone.replace(/\D/g, '')}@renttable.local
            </p>
          )}
          <button onClick={() => setView("home")} className="w-full py-6 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-widest">← На головну</button>
        </div>
      ) : (
        <div className="bg-white rounded-[64px] shadow-2xl p-12 border border-gray-100">
          <h2 className="text-3xl font-black italic mb-10 uppercase border-b pb-8">Оформлення замовлення</h2>
          
          {!currentUser && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Автоматична реєстрація:</strong> Ми створимо облік на основі вашого телефону. Пароль буде відправлено на email.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            <input
              required
              type="text"
              className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
              placeholder="Ім'я"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            />
            <input
              required
              type="tel"
              className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
              placeholder="Телефон (+380...)"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
            />
            <input
              required
              type="email"
              className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
              placeholder="Email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            />
            {/* Поле пароль для входу */}
            {!currentUser && (
              <input
                type="password"
                className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Пароль (для входу, якщо вже є акаунт)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            )}
            <textarea
              className="w-full px-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
              placeholder="Адреса доставки"
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              rows="3"
            />

            {autoRegError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {autoRegError}
              </div>
            )}

            <button
              type="submit"
              disabled={bookingStatus === "loading"}
              className="w-full py-6 bg-gray-900 text-white font-black rounded-full uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-[#C5A059] transition-all disabled:opacity-50"
            >
              {bookingStatus === "loading" ? "⏳ Обробляємо..." : "🛒 Оформити замовлення"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
