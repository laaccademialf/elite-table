import React from "react";
import {
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { CustomCalendar } from "../components/CustomCalendar";
import { SafeImage } from "../components/SafeImage";

const CATEGORIES = [
  { id: 1, name: 'Всі', icon: '📋' },
  { id: 2, name: 'plates', icon: '🍽️', label: 'Тарілки' },
  { id: 3, name: 'glasses', icon: '🍷', label: 'Келихи' },
  { id: 4, name: 'cutlery', icon: '🔪', label: 'Прибори' },
  { id: 5, name: 'textiles', icon: '🧵', label: 'Текстиль' },
];

export const HomeView = () => {
  const {
    globalDates,
    setGlobalDates,
    selectedCategory,
    setSelectedCategory,
    products,
    setSelectedItem,
    setView,
  } = useAppContext();

  const filteredProducts = selectedCategory === 'Всі' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="mb-6 bg-gradient-to-br from-[#FFF7ED] to-[#F8E9D2] p-2 md:p-3 rounded-xl shadow border border-[#F3E5C8] flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 min-h-[160px] transition-all duration-300">
        <div className="flex-1 flex flex-col items-center md:items-start justify-center px-2 md:px-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 uppercase tracking-tight drop-shadow-sm">ВАША ОСОБЛИВА ПОДІЯ</h2>
          <p className="text-slate-600 text-xs md:text-sm mb-1 md:mb-2">Оберіть дату, щоб почати магію сервірування</p>
          {globalDates.start && (
            <div className="mt-1 inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full font-bold uppercase text-xs shadow">
              <CalendarIcon size={12} />
              {globalDates.start}.{(globalDates.month !== undefined ? globalDates.month+1 : 12)}.{globalDates.year || 2025} {globalDates.end ? `- ${globalDates.end}.${(globalDates.month !== undefined ? globalDates.month+1 : 12)}.${globalDates.year || 2025}` : ''}
            </div>
          )}
        </div>
        <div className="w-full md:w-64 flex justify-center items-center">
          <CustomCalendar globalDates={globalDates} setGlobalDates={setGlobalDates} />
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur py-6 -mx-6 px-6 mb-8 shadow-sm">
        <div className="flex flex-wrap justify-center gap-4 max-w-7xl mx-auto">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)} 
              className={`flex flex-col items-center justify-center p-3 rounded-2xl w-20 h-20 md:w-24 md:h-24 transition-all ${
                selectedCategory === cat.name 
                  ? 'bg-slate-900 text-white shadow-lg scale-105' 
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-900'
              }`}
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-xs font-semibold uppercase text-center">{cat.label || cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {filteredProducts.map(product => (
          <div 
            key={product.id} 
            onClick={() => {
              setSelectedItem(product);
              setView('item');
              window.scrollTo(0, 0);
            }}
            className="group cursor-pointer"
          >
            {/* Product Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-4 shadow-sm group-hover:shadow-lg transition-all">
              {product.image ? (
                <SafeImage 
                  src={product.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 text-4xl">
                  📦
                </div>
              )}
              
              {/* Stock Badge */}
              <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                product.quantity > 0 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'bg-red-500 text-white'
              }`}>
                {product.quantity > 0 ? `${product.quantity} В НАЯВНОСТІ` : 'НЕМАЄ'}
              </div>
            </div>

            {/* Product Info */}
            <h3 className="text-sm md:text-base font-bold text-slate-900 uppercase line-clamp-2">
              {product.name}
            </h3>
            <p className="text-slate-600 text-xs line-clamp-1 mb-2">{product.description}</p>
            <p className="text-lg font-bold text-slate-900">
              {product.price} ₴ <span className="text-xs text-slate-500 font-normal">/од</span>
            </p>
          </div>
        ))}
      </div>

      {/* No Products */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg mb-4">Товарів немає у цій категорії</p>
          <button
            onClick={() => setSelectedCategory('Всі')}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
          >
            Переглянути всі товари
          </button>
        </div>
      )}
    </main>
  );
};
