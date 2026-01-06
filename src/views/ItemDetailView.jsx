import React, { useMemo } from "react";
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

  const maxAvailable = getMaxAvailableForRange(selectedItem.id, globalDates.start, globalDates.end);
  const days = globalDates.end ? globalDates.end - globalDates.start + 1 : 1;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-in slide-in-from-right-12 duration-500">
      <button onClick={() => setView('home')} className="mb-10 flex items-center gap-2 text-[#C5A059] font-black uppercase text-[10px] hover:text-gray-900">
        <ChevronLeft size={16}/> Назад
      </button>
      
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <SafeImage src={selectedItem.image} className="w-full aspect-square rounded-[64px] object-cover shadow-2xl" />
        
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-[#C5A059] mb-4">{selectedItem.category}</p>
            <h1 className="text-6xl font-black italic uppercase mb-6 text-gray-900 leading-tight">{selectedItem.title}</h1>
            <div className="space-y-6 mb-12">
              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Опис</p>
                <p className="text-sm italic text-gray-700">{selectedItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#C5A059]/10 p-4 rounded-[24px] border border-[#C5A059]/20">
                  <p className="text-[10px] font-black uppercase text-[#C5A059] mb-1">Матеріал</p>
                  <p className="font-black text-gray-900">{selectedItem.material}</p>
                </div>
                <div className="bg-[#C5A059]/10 p-4 rounded-[24px] border border-[#C5A059]/20">
                  <p className="text-[10px] font-black uppercase text-[#C5A059] mb-1">Ціна за добу</p>
                  <p className="font-black text-gray-900">{selectedItem.price} ₴</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-8 rounded-[48px] shadow-2xl">
            <p className="text-[10px] font-black uppercase text-[#C5A059] mb-6">Доступно: {maxAvailable} од.</p>
            <div className="flex items-center justify-between mb-8 bg-gray-800 p-6 rounded-[28px]">
              <button onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))} className="bg-[#C5A059] w-12 h-12 rounded-full font-black text-white text-lg">−</button>
              <input type="number" value={orderQuantity} onChange={e => setOrderQuantity(Math.min(maxAvailable, Math.max(1, parseInt(e.target.value))))} className="bg-transparent text-white text-center font-black text-2xl w-16 outline-none" />
              <button onClick={() => setOrderQuantity(Math.min(maxAvailable, orderQuantity + 1))} className="bg-[#C5A059] w-12 h-12 rounded-full font-black text-white text-lg">+</button>
            </div>
            <button onClick={() => { addToCart(selectedItem, orderQuantity); setView('cart'); }} className="w-full py-6 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-wider text-sm">
              ➕ Додати {orderQuantity} од. у кошик ({orderQuantity * selectedItem.price * days} ₴)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
