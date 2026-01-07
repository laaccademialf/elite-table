import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";
import DateRangePicker from "../components/DateRangePicker";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

export const HomeView = () => {
  const {
    globalDates,
    setGlobalDates,
    selectedCategory,
    setSelectedCategory,
    products,
    setSelectedItem,
    setView,
    getMaxAvailableForRange,
  } = useAppContext();

  // Категорії тепер з контексту
  const { categories } = useAppContext();
  
  console.log('[HomeView] Categories from context:', categories);
  console.log('[HomeView] Products:', products);
  console.log('[HomeView] Selected category:', selectedCategory);

  const filteredProducts = useMemo(() => {
    return !selectedCategory || selectedCategory === null
      ? products 
      : products.filter(p => p.categoryId === selectedCategory || p.category === selectedCategory);
  }, [products, selectedCategory]);
  
  console.log('[HomeView] Filtered products:', filteredProducts);

  // Доступність по вибраному діапазону дат
  const [availabilityMap, setAvailabilityMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    const loadAvailability = async () => {
      if (!globalDates.start || filteredProducts.length === 0) {
        console.log('[HomeView] Skipping availability load: globalDates.start=', globalDates.start, 'filteredProducts.length=', filteredProducts.length);
        setAvailabilityMap({});
        return;
      }
      console.log('[HomeView] Loading availability for', filteredProducts.length, 'products');
      const entries = await Promise.all(
        filteredProducts.map(async (p) => {
          try {
            console.log(`[HomeView] Fetching availability for product ${p.id} (${p.name})`);
            const available = await getMaxAvailableForRange(p.id, globalDates.start, globalDates.end);
            console.log(`[HomeView] Product ${p.id}: ${available}`);
            return [p.id, available];
          } catch (error) {
            console.error(`[HomeView] Error for product ${p.id}:`, error);
            return [p.id, p.quantity || 0];
          }
        })
      );
      if (!cancelled) {
        const map = Object.fromEntries(entries);
        console.log('[HomeView] Availability map:', map);
        setAvailabilityMap(map);
      }
    };
    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [filteredProducts, globalDates.start, globalDates.end, getMaxAvailableForRange]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="mb-6 bg-gradient-to-br from-[#FFF7ED] to-[#F8E9D2] p-2 md:p-3 rounded-xl shadow border border-[#F3E5C8] flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 min-h-[160px] transition-all duration-300">
        <div className="flex-1 flex flex-col items-center md:items-start justify-center px-2 md:px-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 uppercase tracking-tight drop-shadow-sm">ВАША ОСОБЛИВА ПОДІЯ</h2>
          <p className="text-slate-600 text-xs md:text-sm mb-1 md:mb-2">Оберіть дату, щоб почати магію сервірування</p>
          <DateRangePicker value={globalDates} onChange={setGlobalDates} />
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur py-6 -mx-6 px-6 mb-8 shadow-sm overflow-visible">
        <div className="flex justify-center gap-4 max-w-7xl mx-auto overflow-x-auto overflow-y-visible pb-2 md:flex-wrap md:pb-0 md:overflow-visible scroll-smooth" style={{scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <style>{`
            .flex::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <button
            className={`flex flex-col items-center justify-center p-3 rounded-2xl w-20 h-20 md:w-24 md:h-24 transition-all flex-shrink-0 ${selectedCategory === null ? "bg-slate-900 text-white shadow-lg scale-105" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-900"}`}
            onClick={() => setSelectedCategory(null)}
          >
            <span className="text-2xl mb-1">📋</span>
            <span className="text-[10px] font-bold uppercase text-center leading-tight break-words whitespace-normal w-full overflow-hidden">Всі</span>
          </button>
          {categories.length > 0 && categories.map((category) => (
            <button
              key={category.id}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl w-20 h-20 md:w-24 md:h-24 transition-all flex-shrink-0 ${selectedCategory === category.name ? "bg-slate-900 text-white shadow-lg scale-105" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-900"}`}
              onClick={() => {
                console.log('[HomeView] Category clicked:', category);
                setSelectedCategory(category.name);
              }}
            >
              {category.icon ? (
                <img src={category.icon} alt={category.name} className="w-12 h-12 object-cover rounded-lg mb-1" onError={(e) => e.target.style.display = 'none'} />
              ) : (
                <span className="text-2xl mb-1">🏷️</span>
              )}
              <span className="text-[10px] font-bold uppercase text-center leading-tight break-words whitespace-normal w-full overflow-hidden">{category.name}</span>
            </button>
          ))}
          {categories.length === 0 && (
            <span className="text-slate-400 text-sm ml-4">Категорій немає</span>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {filteredProducts.map(product => {
          // Знаходимо категорію продукту
          const category = categories.find(cat => cat.id === product.categoryId);
          return (
            <div 
              key={product.id} 
              onClick={() => {
                setSelectedItem(product);
                setView('item');
                window.scrollTo(0, 0);
              }}
              className="group cursor-pointer"
            >
              {/* Image Tile with beige border (square) */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white mb-4 shadow-sm group-hover:shadow-lg transition-all border-[3px] border-[#C5A059]">
                {/* Availability Banner (attached, with rounded top-left) */}
                <div className="absolute -top-[3px] -left-[3px] z-10">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-tl-2xl rounded-br-xl bg-[#C5A059] text-white tracking-wide">
                    {globalDates.start
                      ? ((availabilityMap[product.id] ?? null) === null
                          ? '...'
                          : (availabilityMap[product.id] > 0
                              ? `${availabilityMap[product.id]} ДОСТУПНО`
                              : 'НЕДОСТУПНО'))
                      : (product.quantity > 0 ? `${product.quantity} В НАЯВНОСТІ` : 'НЕМАЄ')}
                  </div>
                </div>

                {/* Product Image pushed to background */}
                {product.image ? (
                  <SafeImage
                    src={product.image}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 z-0"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 text-4xl">
                    📦
                  </div>
                )}
              </div>
              {/* Категорія emoji/іконка */}
              {category && category.icon && (
                <div className="flex justify-center mb-1">
                  <span className="text-3xl">{category.icon}</span>
                </div>
              )}
              {/* Product Info */}
              <h3 className="text-sm md:text-base font-bold text-slate-900 uppercase line-clamp-2">
                {product.name}
              </h3>
              <p className="text-slate-600 text-xs line-clamp-1 mb-2">{product.description}</p>
              <p className="text-lg font-bold text-slate-900">
                {product.price} ₴ <span className="text-xs text-slate-500 font-normal">/од/доба</span>
              </p>
            </div>
          );
        })}
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
