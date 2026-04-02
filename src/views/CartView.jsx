import React, { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Calendar as CalendarIcon, Trash2, AlertCircle, Minus, Plus } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";
// AI блок видалено для спрощення інтерфейсу

export const CartView = () => {
  const {
    cart,
    globalDates,
    setView,
    removeFromCart,
    setCartQuantity,
    getMaxAvailableForRange,
    extraServices,
    selectedServiceIds,
    toggleExtraService,
    cartTotals,
  } = useAppContext();

  const days = cartTotals.rentalDays;
  const subtotal = cartTotals.itemsSubtotal;
  const servicesTotal = cartTotals.extraServicesTotal;
  const total = cartTotals.grandTotal;

  // Доступність для товарів у кошику
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

  const activeServices = useMemo(
    () => extraServices.filter((service) => service.active !== false),
    [extraServices]
  );

  // Видалено функції AI (генерація/озвучення концепції)

  return (
    <div className="pb-10 animate-in slide-in-from-bottom-8 duration-500 text-slate-900">
      {/* Продовження navbar */}
      <section className="w-screen relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0b1730] via-[#16325e] to-[#0b1730] border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <button
              onClick={() => setView('home')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-400/70 text-white font-black uppercase text-sm hover:bg-white/10 transition-colors rounded-2xl"
            >
              ← Каталог
            </button>
            <h2 className="text-2xl md:text-3xl font-black uppercase flex items-center gap-3 text-white">
              <ShoppingBag size={26} /> Кошик
            </h2>
            <button
              onClick={() => setView('checkout')}
              disabled={globalDates.start ? insufficiencies.length > 0 : false}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#112248] font-black uppercase text-sm hover:bg-slate-100 transition-colors rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Оформити →
            </button>
          </div>

          {cart.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm p-3 md:p-4 rounded-[20px] border border-white/15 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <CalendarIcon size={18} className="text-[#F0CF88] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F0CF88]">Період оренди</p>
                  <p className="text-sm font-black truncate">
                    {globalDates.start ? `${globalDates.start.day}.${globalDates.start.month + 1}.${globalDates.start.year}` : ''}
                    {globalDates.end ? ` - ${globalDates.end.day}.${globalDates.end.month + 1}.${globalDates.end.year}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 md:gap-7">
                <p className="text-sm font-black whitespace-nowrap">{days} {days === 1 ? 'доба' : 'доби'}</p>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F0CF88]">Всього</p>
                  <p className="text-2xl font-black text-[#F0CF88] whitespace-nowrap">{total.toFixed(0)} ₴</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        {cart.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
            <p className="text-slate-500 uppercase text-xs font-black">Кошик порожній</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid xl:grid-cols-[1.45fr_0.9fr] gap-4 items-start">
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-[28px] p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#112248]">Додаткові послуги</p>
                      <h3 className="text-lg md:text-xl font-black uppercase text-slate-900">Доставка, мийка та інші опції</h3>
                      <p className="text-sm text-slate-500">Оберіть потрібні послуги перед оформленням замовлення.</p>
                    </div>
                    <p className="text-sm font-black text-[#112248]">
                      {servicesTotal > 0 ? `+${servicesTotal.toFixed(0)} ₴` : 'Не обрано'}
                    </p>
                  </div>

                  {activeServices.length === 0 ? (
                    <p className="text-sm text-slate-500">Адміністратор ще не додав додаткові послуги.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {activeServices.map((service) => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        const basePrice = Number(service.price || 0);
                        const serviceTotal = service.billingType === 'per_day' ? basePrice * (days || 1) : basePrice;

                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleExtraService(service.id)}
                            className={`text-left rounded-2xl border p-3 transition-all ${isSelected ? 'border-[#112248] bg-[#eef4ff] shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-900">{service.name}</p>
                                {service.description && (
                                  <p className="mt-1 text-xs text-slate-500">{service.description}</p>
                                )}
                              </div>
                              <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold ${isSelected ? 'border-[#112248] bg-[#112248] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                ✓
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-500">
                                {service.billingType === 'per_day'
                                  ? `${basePrice.toFixed(0)} ₴ × ${days || 1} дн.`
                                  : 'Фіксована ціна'}
                              </span>
                              <span className="font-black text-[#112248]">{serviceTotal.toFixed(0)} ₴</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-[28px] flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                      <SafeImage src={item.image} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-slate-200" />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-black uppercase text-lg md:text-xl tracking-tight text-slate-900">{item.title || item.name}</h4>
                        {item.sku && (
                          <p className="text-xs font-mono text-slate-500 mt-1">Артикул: {item.sku}</p>
                        )}
                        <p className="text-xs md:text-sm font-bold text-[#112248] uppercase mt-1">{item.price} ₴ / од / доба × {item.quantity} од.</p>
                        {globalDates.start && (
                          <div className="mt-2 text-xs">
                            {isLoadingAvail || availability[item.id] === undefined ? (
                              <span className="text-slate-400">Перевіряємо доступність…</span>
                            ) : (
                              <span className={`${(availability[item.id] || 0) === 0 ? 'text-red-500' : availability[item.id] < item.quantity ? 'text-orange-500' : 'text-green-600'}`}>
                                Доступно на обрані дати: <strong>{availability[item.id]}</strong>
                                {availability[item.id] < item.quantity && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-orange-600"><AlertCircle size={14} /> Не вистачає {item.quantity - availability[item.id]} од.</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap md:flex-nowrap">
                        <div className="flex items-center border border-slate-200 rounded-full overflow-hidden shrink-0 bg-slate-50 text-slate-900">
                          <button
                            aria-label="Зменшити"
                            className="px-2.5 py-2 hover:bg-slate-100 transition-colors"
                            onClick={() => setCartQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setCartQuantity(item.id, e.target.value)}
                            className="w-12 text-center font-bold text-slate-900 bg-transparent outline-none focus:outline-none focus:ring-0 border-0 appearance-none py-2 text-sm"
                          />
                          <button
                            aria-label="Збільшити"
                            className="px-2.5 py-2 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            onClick={() => {
                              const max = availability[item.id];
                              const next = (item.quantity || 1) + 1;
                              setCartQuantity(item.id, max ? Math.min(max, next) : next);
                            }}
                            disabled={availability[item.id] !== undefined && item.quantity >= availability[item.id]}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#f8fafc] border border-slate-200 rounded-[28px] p-4 md:p-5 shadow-sm xl:sticky xl:top-24">
                <h3 className="text-lg font-black uppercase text-slate-900 mb-4">Підсумок замовлення</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Товари ({days || 1} дн.)</span>
                    <span className="font-bold text-slate-900">{subtotal.toFixed(0)} ₴</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Додаткові послуги</span>
                    <span className="font-bold text-slate-900">{servicesTotal.toFixed(0)} ₴</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-base font-black uppercase text-slate-900">Всього</span>
                    <span className="text-2xl font-black text-[#112248]">{total.toFixed(0)} ₴</span>
                  </div>
                </div>

                <button
                  onClick={() => setView('checkout')}
                  disabled={globalDates.start ? insufficiencies.length > 0 : false}
                  className="mt-4 w-full py-3 bg-[#112248] text-white rounded-2xl font-black uppercase text-sm hover:bg-[#0c1a35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Перейти до оформлення
                </button>
              </div>
            </div>

            {globalDates.start && insufficiencies.length > 0 && (
              <div className="mt-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
                <div className="font-bold mb-1">Увага: деяких товарів не вистачає на обрані дати</div>
                <ul className="list-disc pl-5 text-sm">
                  {insufficiencies.map((i) => (
                    <li key={i.id}>{i.name}: в кошику {i.need} од., доступно {i.avail} од.</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
