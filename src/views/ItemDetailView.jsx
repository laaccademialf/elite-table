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
  const days = (globalDates?.start && globalDates?.end) ? (globalDates.end - globalDates.start + 1) : 1;
  
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
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in slide-in-from-right-12 duration-500">
      <button onClick={() => setView('home')} className="mb-10 flex items-center gap-2 text-[#C5A059] font-black uppercase text-[10px] hover:text-gray-900">
        <ChevronLeft size={16}/> Назад
      </button>
      
      {/* Верхня секція: зображення + інфо */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Зображення */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-[#C5A059]">
          <SafeImage src={selectedItem.image} className="w-full h-full object-cover" />
        </div>
        
        {/* Інфо: категорія, назва, опис, ціна */}
        <div className="flex flex-col justify-center space-y-4">
          <p className="text-[10px] font-black uppercase text-[#C5A059]">{selectedItem.category}</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase text-gray-900 leading-tight">{selectedItem.title}</h1>
          
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Опис</p>
            <p className="text-sm italic text-gray-700">{selectedItem.description}</p>
          </div>
          
          <div className="bg-[#C5A059]/10 p-4 rounded-2xl border border-[#C5A059]/20">
            <p className="text-[10px] font-black uppercase text-[#C5A059] mb-1">Ціна за добу</p>
            <p className="font-black text-gray-900 text-2xl">{priceNum} ₴</p>
          </div>
        </div>
      </div>

      {/* Нижня секція: панель додавання в кошик */}
      <div className="bg-gray-900 p-6 md:p-8 rounded-[32px] shadow-2xl">
        <div className="mb-6">
          <p className={`text-[10px] font-black uppercase mb-2 ${
            maxAvailable === 0 ? 'text-red-400' : 
            (maxAvailable !== null && maxAvailable <= 5) ? 'text-orange-400' : 
            'text-[#C5A059]'
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
          {/* Кількість */}
          <div className="flex items-center justify-center bg-gray-800 p-4 rounded-3xl gap-4 w-full md:w-auto">
            <button 
              onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))} 
              className="bg-[#C5A059] w-10 h-10 rounded-full font-black text-white text-lg hover:bg-[#B59049] transition"
            >
              −
            </button>
            <input 
              type="number" 
              value={orderQuantity} 
              onChange={e => {
                const val = parseInt(e.target.value) || 1;
                setOrderQuantity(Math.min(maxAvailable || 999, Math.max(1, val)));
              }}
              max={maxAvailable || 999}
              min={1}
              className="bg-transparent text-white text-center font-black text-xl w-16 outline-none" 
            />
            <button 
              onClick={() => setOrderQuantity(Math.min(maxAvailable || 999, orderQuantity + 1))} 
              className="bg-[#C5A059] w-10 h-10 rounded-full font-black text-white text-lg hover:bg-[#B59049] transition"
            >
              +
            </button>
          </div>
          
          {/* Кнопка додавання */}
          <button 
            onClick={() => { addToCart(selectedItem, orderQuantity); setView('cart'); }} 
            disabled={isLoadingAvailability || maxAvailable === 0}
            className="flex-1 w-full py-5 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-wider text-sm hover:bg-[#B59049] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};
