import React from "react";
import {
  Calendar as CalendarIcon,
  Layers,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { CustomCalendar } from "../components/CustomCalendar";
import { SafeImage } from "../components/SafeImage";
import { getIcon } from "../utils/iconUtils";

export const HomeView = () => {
  const {
    globalDates,
    setGlobalDates,
    categories,
    selectedCategory,
    setSelectedCategory,
    items,
    getMaxAvailableForRange,
    setSelectedItem,
    setBookingStatus,
    setOrderQuantity,
    setView,
  } = useAppContext();

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-700">
      <div className="mb-12 card-bg p-8 rounded-xlcard border border-transparent flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 text-primary">ВАША ОСОБЛИВА ПОДІЯ</h2>
          <p className="text-gray-500 text-sm">Оберіть дату, щоб почати магію сервірування</p>
          {globalDates.start && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">
              <CalendarIcon size={14} /> 
              {globalDates.start}.12.2025 {globalDates.end ? `- ${globalDates.end}.12.2025` : ''}
            </div>
          )}
        </div>
        <div className="w-full md:w-80"><CustomCalendar globalDates={globalDates} setGlobalDates={setGlobalDates} /></div>
      </div>

      {/* ЗАКРІПЛЕНІ КАТЕГОРІЇ */}
      <div className="sticky top-16 z-40 bg-transparent py-6 -mx-6 px-6 mb-8 transition-all">
        <div className="flex flex-wrap justify-center gap-4 max-w-7xl mx-auto">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)} 
              className={`flex flex-col items-center justify-center p-3 rounded-[28px] w-20 h-20 md:w-24 md:h-24 transition-all ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-white shadow-xl scale-105' 
                  : 'bg-white border border-gray-100 text-gray-400 hover:border-accent'
              }`}
            >
              <div className={`mb-1 transition-transform ${selectedCategory === cat.name ? 'scale-110' : ''}`}>
                {getIcon(cat.icon, 24)}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {items.filter(i => selectedCategory === 'Всі' || i.category === selectedCategory).map(item => {
          const avail = globalDates.start ? getMaxAvailableForRange(item.id, globalDates.start, globalDates.end) : item.count;
          return (
            <div key={item.id} className="group cursor-pointer" onClick={() => { setSelectedItem(item); setBookingStatus('idle'); setOrderQuantity("1"); setView('item'); window.scrollTo(0,0); }}>
              <div className="relative aspect-square rounded-card overflow-hidden bg-gray-50 border border-transparent mb-5 shadow-soft-card group-hover:shadow-lg transition-shadow group-hover:scale-105 transform duration-300">
                <SafeImage src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${avail > 0 ? 'bg-white text-gray-900 shadow-md' : 'bg-red-500 text-white'}`}>{avail > 0 ? `${avail} В НАЯВНОСТІ` : 'Зайнято'}</div>
              </div>
              <h3 className="text-base md:text-lg font-black uppercase tracking-tight mb-1">{item.title}</h3>
              <p className="text-lg font-black">{item.price} ₴ <span className="text-[10px] text-gray-400 font-bold italic">/ од</span></p>
            </div>
          );
        })}
      </div>
    </main>
  );
};
