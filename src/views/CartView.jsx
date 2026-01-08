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
  } = useAppContext();

  // days in range
  function getDaysInRange(start, end) {
    if (!start) return 0;
    const startDate = new Date(start.year, start.month, start.day);
    const endDate = end ? new Date(end.year, end.month, end.day) : startDate;
    return Math.max(1, Math.round((endDate - startDate) / (1000*60*60*24)) + 1);
  }
  const days = getDaysInRange(globalDates.start, globalDates.end);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity * days,
    0
  );
  const total = subtotal + 100;

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

  // Видалено функції AI (генерація/озвучення концепції)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in slide-in-from-bottom-8 duration-500 text-gray-900">
      {/* Sticky header з кнопками, заголовком та інфо */}
      <div className="sticky top-20 z-20 bg-slate-50 pt-6 pb-6 space-y-6 -mx-6 px-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('home')}
            className="flex items-center gap-2 px-6 py-3 border-2 border-[#C5A059] text-[#C5A059] font-black uppercase text-sm hover:bg-[#C5A059] hover:text-white transition-colors rounded-2xl"
          >
            ← Каталог
          </button>
          <h2 className="text-4xl font-black italic uppercase flex items-center gap-4"><ShoppingBag size={32} /> Кошик</h2>
          <button 
            onClick={() => setView('checkout')}
            disabled={globalDates.start ? insufficiencies.length > 0 : false}
            className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white font-black uppercase text-sm hover:bg-[#b2904f] transition-colors rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Оформити →
          </button>
        </div>

        {cart.length > 0 && (
          <>
            <div className="bg-[#C5A059]/10 p-4 rounded-[24px] border border-[#C5A059]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon size={20} className="text-[#C5A059]" />
                <div>
                  <p className="text-[9px] font-black uppercase text-[#C5A059]">Період оренди</p>
                  <p className="text-sm font-black">{globalDates.start ? `${globalDates.start.day}.${globalDates.start.month+1}.${globalDates.start.year}` : ''} {globalDates.end ? `- ${globalDates.end.day}.${globalDates.end.month+1}.${globalDates.end.year}` : ''}</p>
                </div>
              </div>
              <p className="text-sm font-black">{days} {days === 1 ? 'доба' : 'доби'}</p>
            </div>

            <div className="bg-gray-900 text-white p-6 rounded-[32px] shadow-xl">
              <div className="flex justify-between text-2xl font-black"><span>Разом</span><span className="text-[#C5A059]">{total} ₴</span></div>
            </div>
          </>
        )}
      </div>
      
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[48px] border border-dashed"><p className="text-gray-400 uppercase text-xs font-black">Кошик порожній</p></div>
      ) : (
        <div className="space-y-6">
          {/* AI блок видалено за побажанням дизайну */}

          {cart.map(item => (
            <div key={item.id} className="p-6 bg-white border border-gray-100 rounded-[32px] flex items-center gap-6 shadow-sm">
              <SafeImage src={item.image} className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover" />
              <div className="flex-1">
                <h4 className="font-black uppercase text-xl md:text-2xl tracking-tight">{item.title}</h4>
                {item.sku && (
                  <p className="text-xs font-mono text-gray-500 mt-1">Артикул: {item.sku}</p>
                )}
                <p className="text-xs md:text-sm font-bold text-[#C5A059] uppercase mt-1">{item.price} ₴ /од/доба × {item.quantity} од.</p>
                {globalDates.start && (
                  <div className="mt-2 text-xs">
                    {isLoadingAvail || availability[item.id] === undefined ? (
                      <span className="text-gray-400">Перевіряємо доступність…</span>
                    ) : (
                      <span className={`${(availability[item.id] || 0) === 0 ? 'text-red-500' : (availability[item.id] < item.quantity ? 'text-orange-500' : 'text-green-600')}`}>
                        Доступно на обрані дати: <strong>{availability[item.id]}</strong>
                        {availability[item.id] < item.quantity && (
                          <span className="ml-2 inline-flex items-center gap-1 text-orange-600"><AlertCircle size={14}/> Не вистачає {item.quantity - availability[item.id]} од.</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                {/* Quantity control */}
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden shrink-0">
                  <button
                    aria-label="Зменшити"
                    className="px-2 md:px-3 py-1 md:py-2 hover:bg-gray-50 text-sm md:text-base"
                    onClick={() => setCartQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => setCartQuantity(item.id, e.target.value)}
                    className="w-10 md:w-14 text-center font-bold text-slate-900 bg-transparent outline-none focus:outline-none focus:ring-0 border-0 appearance-none py-1 md:py-2 text-sm"
                  />
                  <button
                    aria-label="Збільшити"
                    className="px-2 md:px-3 py-1 md:py-2 hover:bg-gray-50 text-sm md:text-base"
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
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}

          {globalDates.start && insufficiencies.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
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
  );
};
