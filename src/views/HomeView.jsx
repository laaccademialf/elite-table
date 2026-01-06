import React, { useEffect, useState } from "react";
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
  } = useAppContext();

  const [categories, setCategories] = useState([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const fetchedCategories = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (fetchedCategories.length === 0) {
          setCategories([]);
        } else {
          setCategories(fetchedCategories);
        }
      }
    );
    return () => unsubscribe();
  }, []);

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
          <DateRangePicker value={globalDates} onChange={setGlobalDates} />
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur py-6 -mx-6 px-6 mb-8 shadow-sm">
        <div className="flex flex-wrap justify-center gap-4 max-w-7xl mx-auto">
          <button
            className={`px-4 py-2 rounded-full border transition-colors ${selectedCategory === null ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-800 border-slate-300 hover:bg-blue-50"}`}
            onClick={() => setSelectedCategory(null)}
          >
            Всі
          </button>
          {categories.length > 0 && categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full border transition-colors flex items-center gap-2 ${selectedCategory === category.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-800 border-slate-300 hover:bg-blue-50"}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
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
