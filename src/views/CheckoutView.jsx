import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { registerUserWithPhone, loginUser, registerUser } from "../services/firebase";
import { startLiqPayCheckout } from "../services/liqpay";

export const CheckoutView = () => {
  const {
    view,
    setView,
    bookingStatus,
    customerInfo,
    setCustomerInfo,
    handleOrderSubmit,
    completeCheckoutSuccess,
    currentUser,
    refreshUser,
    cart,
    globalDates,
    getMaxAvailableForRange,
    selectedExtraServices,
    cartTotals,
  } = useAppContext();

  const [autoRegError, setAutoRegError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [password, setPassword] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manager_confirmation");
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  const finalizeOrderFlow = async (submitEvent, resolvedUserId = null, redirectToOrders = false) => {
    const result = await handleOrderSubmit(submitEvent, resolvedUserId, {
      paymentMethod,
      deferSuccessHandling: true,
    });

    if (!result?.orderId) {
      return false;
    }

    if (paymentMethod === 'liqpay') {
      try {
        setIsRedirectingToPayment(true);
        setPaymentError('');

        await startLiqPayCheckout({
          orderId: result.orderId,
          amount: result.orderPayload.totalPrice,
          description: `Оплата замовлення LaFamiglia Rentco #${result.orderId.slice(0, 8)}`,
          customerName: result.orderPayload.customerName,
          customerPhone: result.orderPayload.customerPhone,
          customerEmail: result.orderPayload.customerEmail,
          notes: result.orderPayload.notes,
        });

        await completeCheckoutSuccess(result.userId, redirectToOrders ? 'orders' : 'home');
        return true;
      } catch (error) {
        console.error('LiqPay checkout error:', error);
        setPaymentError(error.message || 'Не вдалося відкрити сторінку оплати LiqPay.');
        setIsRedirectingToPayment(false);
        return false;
      }
    }

    await completeCheckoutSuccess(result.userId, redirectToOrders ? 'orders' : 'home');
    setTimeout(() => {
      alert("Дякуємо за замовлення! З вами зв'яжеться менеджер для уточнення деталей.");
      if (redirectToOrders) {
        setView('orders');
      }
    }, 100);

    return true;
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setAutoRegError('');
    setPaymentError('');

    // Якщо користувач не залогінений і ввів email+пароль — пробуємо створити акаунт, якщо вже існує — логін
    if (!currentUser && customerInfo.email && password) {
      try {
        await registerUser(
          customerInfo.email,
          password,
          {
            name: customerInfo.name,
            phone: customerInfo.phone,
            role: 'customer',
          }
        );
        if (typeof refreshUser === 'function') await refreshUser();
        await finalizeOrderFlow(e, null, true);
        return;
      } catch (error) {
        // Якщо акаунт вже існує — пробуємо логін
        if (error.code === 'auth/email-already-in-use') {
          try {
            await loginUser(customerInfo.email, password);
            if (typeof refreshUser === 'function') await refreshUser();
            await finalizeOrderFlow(e, null, true);
            return;
          } catch (loginErr) {
            setAutoRegError(loginErr.message || 'Помилка входу. Спробуйте ще раз або скористайтесь автозаповненням телефону.');
            return;
          }
        } else {
          setAutoRegError(error.message || 'Помилка реєстрації. Спробуйте ще раз.');
          return;
        }
      }
    }

    // Якщо не залогінений і не ввів пароль — авто-реєстрація по телефону
    if (!currentUser) {
      try {
        const result = await registerUserWithPhone(customerInfo.phone, customerInfo.name);
        console.log('Auto-registered user:', result);
        // Оновлюємо customerInfo для коректного замовлення
        setCustomerInfo((prev) => ({
          ...prev,
          name: customerInfo.name || 'Клієнт',
          phone: customerInfo.phone,
          email: result.email,
        }));
        // Даємо Firebase часу синхронізувати auth стан, особливо на мобільному
        if (typeof refreshUser === 'function') {
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshUser();
        }
        await finalizeOrderFlow(e, result.uid, false);
      } catch (error) {
        setAutoRegError(error.message || 'Помилка реєстрації. Спробуйте ще раз.');
        return;
      }
    } else {
      await finalizeOrderFlow(e, null, true);
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

  const rentalDays = cartTotals.rentalDays || 1;

  if (view !== "checkout") return null;

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-slate-400 transition placeholder-gray-400 font-medium";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-gray-900 animate-in slide-in-from-bottom-8 duration-500">
      {bookingStatus === "success" && !currentUser && (
        <div className="text-center py-16 bg-gray-900 rounded-3xl shadow-2xl px-10 mb-6">
          <CheckCircle2 size={56} className="mx-auto text-green-400 mb-6 animate-bounce" />
          <h2 className="text-3xl font-black italic mb-4 uppercase text-white">Замовлення прийнято!</h2>
          <p className="text-sm text-gray-400 mb-8 italic">Дякуємо! З вами зв'яжеться менеджер для уточнення деталей.</p>
          <button onClick={() => setView("home")} className="px-8 py-4 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-widest">← На головну</button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-black uppercase tracking-wide">Оформлення замовлення</h2>
        </div>

        <form onSubmit={handleCheckoutSubmit}>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* Left column — contact fields */}
            <div className="p-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Контактні дані</p>

              {!currentUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-800">
                  <AlertCircle size={13} className="inline mr-1" />
                  Ми автоматично створимо профіль або увійдемо в існуючий.
                </div>
              )}

              {globalDates.start && (
                isLoadingAvail ? (
                  <div className="bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs">Перевіряємо доступність…</div>
                ) : insufficiencies.length > 0 ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">
                    <span className="font-bold">Недостатньо товарів:</span>{' '}
                    {insufficiencies.map(i => `${i.name} (потрібно ${i.need}, є ${i.avail})`).join('; ')}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl text-xs">✅ Все доступно на обрані дати</div>
                )
              )}

              {currentUser ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-800">
                  Ви увійшли як <strong>{currentUser.name || currentUser.email}</strong>. Вкажіть адресу та коментар.
                </div>
              ) : (
                <>
                  <input required type="text" className={inputCls} placeholder="Ім'я *"
                    value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="tel" className={inputCls} placeholder="Телефон *"
                      value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                    <input required type="email" className={inputCls} placeholder="Email *"
                      value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
                  </div>
                  <input type="password" className={inputCls} placeholder="Пароль (необов'язково)"
                    value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </>
              )}

              <input type="text" className={inputCls} placeholder="Адреса доставки"
                value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
              <textarea className={inputCls + " resize-none"} placeholder="Коментар (необов'язково)"
                value={customerInfo.notes || ''} onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })} rows="2" />

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Спосіб оплати</p>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 cursor-pointer transition text-sm ${paymentMethod === 'manager_confirmation' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="paymentMethod" value="manager_confirmation"
                      checked={paymentMethod === 'manager_confirmation'} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Заявка без оплати</p>
                      <p className="text-xs text-slate-500">Менеджер підтвердить деталі та домовиться про оплату.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 cursor-pointer transition text-sm ${paymentMethod === 'liqpay' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="paymentMethod" value="liqpay"
                      checked={paymentMethod === 'liqpay'} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Оплатити через LiqPay</p>
                      <p className="text-xs text-slate-500">Visa / Mastercard онлайн одразу після оформлення.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right column — order summary */}
            <div className="p-5 flex flex-col justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ваше замовлення</p>
                <div className="space-y-1.5 text-sm">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2 text-slate-700">
                      <span className="truncate">{item.name || item.title} × {item.quantity}</span>
                      <span className="font-semibold shrink-0">{(item.price * item.quantity * rentalDays).toFixed(0)} ₴</span>
                    </div>
                  ))}
                  {selectedExtraServices.map((s) => (
                    <div key={s.id} className="flex justify-between gap-2 text-slate-600">
                      <span className="truncate">{s.name}</span>
                      <span className="font-semibold shrink-0">{Number(s.total || 0).toFixed(0)} ₴</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{rentalDays} {rentalDays === 1 ? 'доба' : 'доби'}</span>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">До сплати</p>
                    <p className="text-2xl font-black text-slate-900">{cartTotals.grandTotal.toFixed(0)} ₴</p>
                  </div>
                </div>
              </div>

              {autoRegError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">{autoRegError}</div>
              )}
              {paymentError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-sm">{paymentError}</div>
              )}

              <button
                type="submit"
                disabled={bookingStatus === "loading" || isRedirectingToPayment || (globalDates.start && insufficiencies.length > 0)}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-sm shadow-lg hover:bg-[#C5A059] transition-all disabled:opacity-50"
              >
                {bookingStatus === "loading" ? "⏳ Обробляємо..."
                  : isRedirectingToPayment ? "💳 Переходимо до LiqPay..."
                  : (globalDates.start && insufficiencies.length > 0) ? "Недостатньо товарів"
                  : paymentMethod === 'liqpay' ? "💳 Оплатити через LiqPay"
                  : "🛒 Оформити замовлення"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

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

          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Спосіб оформлення</p>
            <div className="grid md:grid-cols-2 gap-3">
              <label className={`rounded-2xl border-2 p-4 cursor-pointer transition ${paymentMethod === 'manager_confirmation' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="manager_confirmation"
                  checked={paymentMethod === 'manager_confirmation'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Заявка без онлайн-оплати</p>
                <p className="text-sm text-slate-500 mt-1">Менеджер підтвердить деталі, а оплату узгодите окремо.</p>
              </label>

              <label className={`rounded-2xl border-2 p-4 cursor-pointer transition ${paymentMethod === 'liqpay' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="liqpay"
                  checked={paymentMethod === 'liqpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Оплатити зараз через LiqPay</p>
                <p className="text-sm text-slate-500 mt-1">Безпечна онлайн-оплата карткою Visa / Mastercard одразу після оформлення.</p>
              </label>
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-900 text-white p-6 space-y-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D7B46A]">Підсумок</p>
                <h3 className="text-xl font-black uppercase">Ваше замовлення</h3>
              </div>
              <p className="text-sm font-semibold text-slate-300">{rentalDays} {rentalDays === 1 ? 'доба' : 'доби'}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span>Товари</span>
                <span className="font-bold text-white">{cartTotals.itemsSubtotal.toFixed(0)} ₴</span>
              </div>

              {selectedExtraServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between text-slate-300 gap-3">
                  <span>{service.name}</span>
                  <span className="font-bold text-white">{Number(service.total || 0).toFixed(0)} ₴</span>
                </div>
              ))}

              <div className="pt-3 mt-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-base font-black uppercase">До сплати</span>
                <span className="text-2xl font-black text-[#E7C983]">{cartTotals.grandTotal.toFixed(0)} ₴</span>
              </div>
            </div>
          </div>

          {autoRegError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {autoRegError}
            </div>
          )}

          {paymentError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded">
              {paymentError}
            </div>
          )}

          <button
            type="submit"
            disabled={bookingStatus === "loading" || isRedirectingToPayment || (globalDates.start && insufficiencies.length > 0)}
            className="w-full py-6 bg-gray-900 text-white font-black rounded-full uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-[#C5A059] transition-all disabled:opacity-50"
          >
            {bookingStatus === "loading"
              ? "⏳ Обробляємо..."
              : isRedirectingToPayment
                ? "💳 Переходимо до LiqPay..."
                : (globalDates.start && insufficiencies.length > 0
                    ? "Недостатньо товарів"
                    : paymentMethod === 'liqpay'
                      ? "💳 Оплатити через LiqPay"
                      : "🛒 Оформити замовлення")}
          </button>
        </form>
      </div>
    </div>
  );
};
