import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { registerUserWithPhone, loginUser, registerUser } from "../services/firebase";

export const CheckoutView = () => {
  const {
    view,
    setView,
    bookingStatus,
    customerInfo,
    setCustomerInfo,
    handleOrderSubmit,
    currentUser,
    refreshUser,
    cart,
    globalDates,
    getMaxAvailableForRange,
  } = useAppContext();

  const [autoRegError, setAutoRegError] = useState("");
  const [password, setPassword] = useState("");

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setAutoRegError("");

    // Якщо користувач не залогінений і ввів email+пароль — пробуємо створити акаунт, якщо вже існує — логін
    if (!currentUser && customerInfo.email && password) {
      try {
        await registerUser(
          customerInfo.email,
          password,
          {
            name: customerInfo.name,
            phone: customerInfo.phone,
            role: "customer",
          }
        );
        if (typeof refreshUser === 'function') await refreshUser();
        await handleOrderSubmit(e);
        // Після оформлення — якщо залогінений, одразу на замовлення
        setTimeout(() => {
          alert("Дякуємо за замовлення! З вами зв'яжеться менеджер для уточнення деталей.");
          setView("orders");
        }, 100);
        return;
      } catch (error) {
        // Якщо акаунт вже існує — пробуємо логін
        if (error.code === "auth/email-already-in-use") {
          try {
            await loginUser(customerInfo.email, password);
            if (typeof refreshUser === 'function') await refreshUser();
            await handleOrderSubmit(e);
            setTimeout(() => {
              alert("Дякуємо за замовлення! З вами зв'яжеться менеджер для уточнення деталей.");
              setView("orders");
            }, 100);
            return;
          } catch (loginErr) {
            setAutoRegError(loginErr.message || "Помилка входу. Спробуйте ще раз або скористайтесь автозаповненням телефону.");
            return;
          }
        } else {
          setAutoRegError(error.message || "Помилка реєстрації. Спробуйте ще раз.");
          return;
        }
      }
    }

    // Якщо не залогінений і не ввів пароль — авто-реєстрація по телефону
    if (!currentUser) {
      try {
        const result = await registerUserWithPhone(customerInfo.phone, customerInfo.name);
        console.log("Auto-registered user:", result);
        // Оновлюємо customerInfo для коректного замовлення
        setCustomerInfo((prev) => ({
          ...prev,
          name: customerInfo.name || 'Клієнт',
          phone: customerInfo.phone,
          email: result.email,
        }));
        // Чекаємо оновлення стану
        setTimeout(async () => {
          await handleOrderSubmit(e);
        }, 0);
      } catch (error) {
        setAutoRegError(error.message || "Помилка реєстрації. Спробуйте ще раз.");
        return;
      }
    } else {
      await handleOrderSubmit(e);
      setTimeout(() => {
        alert("Дякуємо за замовлення! З вами зв'яжеться менеджер для уточнення деталей.");
        setView("orders");
      }, 100);
    }
  };

  // Перевірка доступності перед сабмітом (UI-рівень)
  const [availability, setAvailability] = useState({});
  const [isLoadingAvail, setIsLoadingAvail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!globalDates.start || cart.length === 0) {
        setAvailability({});
        return;
      }
      setIsLoadingAvail(true);
      const pairs = await Promise.all(
        cart.map(async (item) => {
          try {
            const a = await getMaxAvailableForRange(item.id, globalDates.start, globalDates.end);
            return [item.id, a];
          } catch {
            return [item.id, item.quantity || 0];
          }
        })
      );
      if (!cancelled) {
        setAvailability(Object.fromEntries(pairs));
        setIsLoadingAvail(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cart, globalDates.start, globalDates.end, getMaxAvailableForRange]);

  const insufficiencies = useMemo(() => {
    if (!globalDates.start) return [];
    return cart
      .map((item) => {
        const avail = availability[item.id];
        if (typeof avail === 'number' && item.quantity > avail) {
          return { id: item.id, name: item.title || item.name, need: item.quantity, avail };
        }
        return null;
      })
      .filter(Boolean);
  }, [cart, availability, globalDates.start]);

  if (view !== "checkout") return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12 text-gray-900 animate-in slide-in-from-bottom-8 duration-500">
      {/* Для гостей після успішного замовлення показуємо подяку, але форма не зникає */}
      {bookingStatus === "success" && !currentUser && (
        <div className="text-center py-20 bg-gray-900 rounded-[64px] shadow-2xl px-12 mb-8">
          <CheckCircle2 size={64} className="mx-auto text-green-400 mb-8 animate-bounce" />
          <h2 className="text-4xl font-black italic mb-6 uppercase text-white">Замовлення прийнято!</h2>
          <p className="text-sm text-gray-400 mb-4 italic">Дякуємо за вашу довіру. З вами зв'яжеться менеджер для уточнення деталей.</p>
          <p className="text-xs text-gray-500 mb-10">
            <strong>Ваш облік створено:</strong> Email: {customerInfo.phone.replace(/\D/g, '')}@renttable.local
          </p>
          <button onClick={() => setView("home")} className="w-full py-6 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-widest">← На головну</button>
        </div>
      )}
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
        {/* Попередження про доступність */}
        {globalDates.start && (
          <div className="mb-6">
            {isLoadingAvail ? (
              <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded text-sm">Перевіряємо доступність…</div>
            ) : insufficiencies.length > 0 ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <div className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={18}/> Недостатньо товарів на обрані дати</div>
                <ul className="list-disc pl-5 text-sm">
                  {insufficiencies.map((i) => (
                    <li key={i.id}>{i.name}: в кошику {i.need} од., доступно {i.avail} од.</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">Все доступно на обрані дати ✅</div>
            )}
          </div>
        )}

        <form onSubmit={handleCheckoutSubmit} className="space-y-6">
          {currentUser ? (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded text-blue-900 text-sm">
                <strong>Вкажіть адресу доставки та побажання до замовлення.</strong><br />
                Ваші контактні дані вже збережені, менеджер зв'яжеться з вами для уточнення деталей.
              </div>
              <textarea
                className="w-full px-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Адреса доставки"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                rows="3"
              />
              <textarea
                className="w-full px-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Коментарі або побажання до замовлення (необов'язково)"
                value={customerInfo.notes || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                rows="2"
              />
            </>
          ) : (
            <>
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
              <input
                type="password"
                className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Пароль (для створення або входу в акаунт)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <textarea
                className="w-full px-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Адреса доставки"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                rows="3"
              />
              <textarea
                className="w-full px-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400"
                placeholder="Коментарі або побажання до замовлення (необов'язково)"
                value={customerInfo.notes || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                rows="2"
              />
            </>
          )}
          {autoRegError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {autoRegError}
            </div>
          )}
          <button
            type="submit"
            disabled={bookingStatus === "loading" || (globalDates.start && insufficiencies.length > 0)}
            className="w-full py-6 bg-gray-900 text-white font-black rounded-full uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-[#C5A059] transition-all disabled:opacity-50"
          >
            {bookingStatus === "loading" ? "⏳ Обробляємо..." : (globalDates.start && insufficiencies.length > 0 ? "Недостатньо товарів" : "🛒 Оформити замовлення")}
          </button>
        </form>
      </div>
    </div>
  );
};
