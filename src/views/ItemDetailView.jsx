import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  Minus,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";

export const ItemDetailView = () => {
  const {
    selectedItem,
    setView,
    orderQuantity,
    setOrderQuantity,
    globalDates,
    addToCart,
    getMaxAvailableForRange,
  } = useAppContext();

  if (!selectedItem) return null;

  const [maxAvailable, setMaxAvailable] = useState(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const priceNum = Number(selectedItem.price) || 0;
  
  // Безпечно розраховуємо кількість днів з об'єктів дат
  const days = useMemo(() => {
    if (!globalDates?.start || !globalDates?.end) return 1;
    try {
      const startDate = globalDates.start instanceof Date 
        ? globalDates.start 
        : new Date(globalDates.start.year, globalDates.start.month, globalDates.start.day);
      const endDate = globalDates.end instanceof Date 
        ? globalDates.end 
        : new Date(globalDates.end.year, globalDates.end.month, globalDates.end.day);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  }, [globalDates?.start, globalDates?.end]);
  
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      const available = await getMaxAvailableForRange(selectedItem.id, globalDates.start, globalDates.end);
      setMaxAvailable(available);
      setIsLoadingAvailability(false);
      
      // Обмежуємо поточну кількість, якщо вона більша за доступну
      if (available !== null && orderQuantity > available) {
        setOrderQuantity(Math.max(1, available));
      }
    };
    
    fetchAvailability();
  }, [selectedItem.id, globalDates.start, globalDates.end, getMaxAvailableForRange, orderQuantity, setOrderQuantity]);
  
  const totalPrice = priceNum * orderQuantity * days;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 animate-in slide-in-from-right-12 duration-500 text-slate-900">
      <button
        onClick={() => setView('home')}
        className="mb-6 md:mb-8 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-[#081226] font-black uppercase text-[10px] hover:bg-slate-100 hover:text-[#081226] transition-all duration-200 shadow-sm"
      >
        <ChevronLeft size={16}/> Назад
      </button>
      
      {/* Mobile: компактний вертикальний layout */}
      <div className="md:hidden space-y-4">
        {/* Зображення компактне */}
        <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-300">
          <SafeImage src={selectedItem.image} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 bg-[#081226] text-[#F4E8C6] px-3 py-1 rounded-full text-[9px] font-black uppercase">
            {selectedItem.category}
          </div>
        </div>
        
        {/* Назва і ціна */}
        <div>
          <h1 className="text-2xl font-black uppercase text-[#081226] leading-tight mb-3">{selectedItem.name || selectedItem.name || selectedItem.title}</h1>
          {selectedItem.sku && (
            <p className="text-xs font-mono text-slate-500 mb-2">Артикул: {selectedItem.sku}</p>
          )}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-4xl font-black text-[#081226]">{priceNum} ₴</span>
            <span className="text-sm text-slate-500 font-bold">/од/доба</span>
          </div>
        </div>
        
        {/* Панель додавання */}
        <div className="bg-[#081226] p-4 rounded-3xl shadow-xl border border-slate-800">
          <p className={`text-[10px] font-black uppercase mb-3 ${
            maxAvailable === 0 ? 'text-red-400' : 
            (maxAvailable !== null && maxAvailable <= 5) ? 'text-orange-400' : 
            'text-slate-200'
          }`}>
            {isLoadingAvailability 
              ? 'Перевірка...' 
              : (maxAvailable !== null ? `Доступно: ${maxAvailable} од.` : 'Оберіть дати')}
          </p>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center bg-slate-900 p-2 rounded-2xl gap-3 border border-slate-700">
              <button 
                onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))} 
                className="bg-white w-9 h-9 rounded-full font-black text-[#081226] hover:bg-slate-100 transition-colors"
              >
                −
              </button>
              <input 
                type="number" 
                value={orderQuantity} 
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setOrderQuantity(Math.min((maxAvailable ?? 999), Math.max(1, val)));
                }}
                max={maxAvailable ?? 999}
                min={1}
                className="bg-transparent text-white text-center font-black text-lg w-12 outline-none" 
              />
              <button 
                onClick={() => setOrderQuantity(Math.min((maxAvailable ?? 999), orderQuantity + 1))} 
                className="bg-white w-9 h-9 rounded-full font-black text-[#081226] hover:bg-slate-100 transition-colors"
              >
                +
              </button>
            </div>
            
            <button 
              onClick={() => { addToCart(selectedItem, orderQuantity); setView('cart'); }} 
              disabled={isLoadingAvailability || maxAvailable === 0}
              className="flex-1 py-4 bg-[#E7C983] text-[#081226] font-black rounded-full uppercase text-xs hover:bg-[#f0ddb3] transition disabled:opacity-50 shadow-sm"
            >
              {maxAvailable === 0 ? '❌ Немає' : `➕ ${totalPrice} ₴`}
            </button>
          </div>
          
          {!isLoadingAvailability && maxAvailable !== null && maxAvailable > 0 && maxAvailable <= 5 && (
            <div className="flex items-center gap-2 text-[10px] text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">
              <AlertCircle size={12} />
              <span className="font-bold">Обмежена кількість</span>
            </div>
          )}
        </div>
        
        {/* Опис (коротко, внизу) */}
        {selectedItem.description && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{selectedItem.description}</p>
          </div>
        )}
      </div>

      {/* Desktop: оригінальний layout */}
      <div className="hidden md:block">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Зліва: фото */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-300">
            <SafeImage src={selectedItem.image} className="w-full h-full object-cover" />
          </div>
          
          {/* Справа: контент */}
          <div className="flex flex-col justify-between gap-4">
            {/* Верхня частина: категорія, назва, артикул */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedItem.category}</p>
              <h1 className="text-xl md:text-2xl font-black uppercase text-[#081226] leading-tight">{selectedItem.name || selectedItem.title}</h1>
              {selectedItem.sku && (
                <p className="text-xs font-mono text-slate-500">Артикул: {selectedItem.sku}</p>
              )}
            </div>
            
            {/* Опис - розширюється до низу */}
            <div className="bg-[#4a5266] p-5 rounded-3xl border border-slate-500/40 flex flex-col flex-grow shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-300 mb-2">Опис</p>
              <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed">{selectedItem.description}</p>
            </div>
            
            {/* Нижня частина: ціна */}
            <div className="bg-[#4a5266] p-4 rounded-2xl border border-slate-500/40 shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#D7B46A] mb-1">Ціна за добу</p>
              <p className="font-black text-white text-2xl">{priceNum} ₴</p>
            </div>
          </div>
        </div>

        <div className="bg-[#081226] p-6 md:p-8 rounded-[32px] shadow-2xl mt-8 border border-slate-800">
          <div className="mb-6">
            <p className={`text-[10px] font-black uppercase mb-2 ${
              maxAvailable === 0 ? 'text-red-400' : 
              (maxAvailable !== null && maxAvailable <= 5) ? 'text-orange-400' : 
              'text-slate-200'
            }`}>
              {isLoadingAvailability 
                ? 'Перевірка доступності...' 
                : (maxAvailable !== null ? `Доступно: ${maxAvailable} од.` : 'Оберіть дати')}
            </p>
            {!isLoadingAvailability && maxAvailable !== null && maxAvailable > 0 && maxAvailable <= 5 && (
              <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 px-3 py-2 rounded-full inline-flex">
                <AlertCircle size={14} />
                <span className="font-bold">Обмежена кількість</span>
              </div>
            )}
            {!isLoadingAvailability && maxAvailable === 0 && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-full inline-flex">
                <AlertCircle size={14} />
                <span className="font-bold">Товар недоступний на обрані дати</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center justify-center bg-slate-900 p-4 rounded-3xl gap-4 w-full md:w-auto border border-slate-700">
              <button 
                onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))} 
                className="bg-white w-10 h-10 rounded-full font-black text-[#081226] text-lg hover:bg-slate-100 transition"
              >
                −
              </button>
              <input 
                type="number" 
                value={orderQuantity} 
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setOrderQuantity(Math.min((maxAvailable ?? 999), Math.max(1, val)));
                }}
                max={maxAvailable ?? 999}
                min={1}
                className="bg-transparent text-white text-center font-black text-xl w-16 outline-none" 
              />
              <button 
                onClick={() => setOrderQuantity(Math.min((maxAvailable ?? 999), orderQuantity + 1))} 
                className="bg-white w-10 h-10 rounded-full font-black text-[#081226] text-lg hover:bg-slate-100 transition"
              >
                +
              </button>
            </div>
            
            <button 
              onClick={() => { addToCart(selectedItem, orderQuantity); setView('cart'); }} 
              disabled={isLoadingAvailability || maxAvailable === 0}
              className="flex-1 w-full py-5 bg-[#E7C983] text-[#081226] font-black rounded-full uppercase tracking-wider text-sm hover:bg-[#f0ddb3] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoadingAvailability
                ? 'Перевірка доступності...'
                : (maxAvailable === 0
                  ? '❌ Немає в наявності'
                  : `➕ Додати у кошик (${totalPrice} ₴)`) }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
