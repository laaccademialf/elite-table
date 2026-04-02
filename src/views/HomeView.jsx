import React, { useEffect, useMemo, useRef, useState } from "react";
import { Instagram, Facebook, Phone } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";
import DateRangePicker from "../components/DateRangePicker";

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
    categories,
  } = useAppContext();

  const [selectedParentId, setSelectedParentId] = useState(null);
  const topCategoriesRef = useRef(null);
  const subcategoriesRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    preventClick: false,
    moved: false,
  });

  const topCategories = useMemo(() => {
    const roots = categories.filter((category) => !category.parentId);
    return roots.length > 0 ? roots : categories;
  }, [categories]);

  const activeSubcategories = useMemo(
    () => categories.filter((category) => category.parentId === selectedParentId),
    [categories, selectedParentId]
  );

  useEffect(() => {
    if (!selectedCategory) return;
    const matchedCategory = categories.find(
      (category) => category.name === selectedCategory || category.id === selectedCategory
    );
    if (matchedCategory?.parentId) {
      setSelectedParentId(matchedCategory.parentId);
    }
  }, [selectedCategory, categories]);

  const stopDragging = () => {
    if (dragStateRef.current.isDragging && dragStateRef.current.moved) {
      dragStateRef.current.preventClick = true;
      window.setTimeout(() => {
        dragStateRef.current.preventClick = false;
      }, 120);
    }
    dragStateRef.current.isDragging = false;
  };

  useEffect(() => {
    window.addEventListener('mouseup', stopDragging);
    return () => window.removeEventListener('mouseup', stopDragging);
  }, []);

  const handleDragStart = (ref) => (event) => {
    const element = ref.current;
    if (!element) return;
    dragStateRef.current.isDragging = true;
    dragStateRef.current.startX = event.pageX;
    dragStateRef.current.scrollLeft = element.scrollLeft;
    dragStateRef.current.moved = false;
  };

  const handleDragMove = (ref) => (event) => {
    const element = ref.current;
    if (!element || !dragStateRef.current.isDragging) return;

    const distance = event.pageX - dragStateRef.current.startX;
    if (Math.abs(distance) > 4) {
      dragStateRef.current.moved = true;
      event.preventDefault();
      element.scrollLeft = dragStateRef.current.scrollLeft - distance;
    }
  };

  const runIfNotDragging = (callback) => () => {
    if (dragStateRef.current.preventClick) return;
    callback();
  };

  const matchesCategory = (product, category) => {
    if (!category) return false;
    return (
      product.categoryId === category.id ||
      product.category === category.id ||
      product.category === category.name
    );
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategory) {
      const matchedCategory = categories.find(
        (category) => category.name === selectedCategory || category.id === selectedCategory
      );

      if (matchedCategory) {
        return products.filter((product) => matchesCategory(product, matchedCategory));
      }

      return products.filter(
        (product) => product.categoryId === selectedCategory || product.category === selectedCategory
      );
    }

    if (selectedParentId) {
      const family = categories.filter(
        (category) => category.id === selectedParentId || category.parentId === selectedParentId
      );
      return products.filter((product) => family.some((category) => matchesCategory(product, category)));
    }

    return products;
  }, [products, selectedCategory, selectedParentId, categories]);

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
    <main className="max-w-7xl mx-auto px-6 pt-0 pb-8 animate-in fade-in duration-700 text-slate-900">
      {/* Hero Section */}
      <div className="w-screen relative left-1/2 -translate-x-1/2 mb-4 bg-gradient-to-r from-[#081226] via-[#112248] to-[#081226] px-6 pt-2 pb-4 md:pt-3 md:pb-4 border-b border-slate-700 transition-all duration-300 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-center justify-between gap-3 min-h-[72px]">
          {/* Header and DatePicker */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-1 px-1 self-start md:self-center">
            <h2 className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-tight drop-shadow-sm leading-none">ВАША ОСОБЛИВА ПОДІЯ</h2>
            <p className="text-slate-300 text-xs md:text-sm">Оберіть дату, щоб почати магію сервірування</p>
            <div className="w-full md:w-auto flex justify-center md:justify-start">
              <DateRangePicker value={globalDates} onChange={setGlobalDates} />
            </div>
          </div>

          {/* Phone + Socials */}
          <div className="flex flex-col items-center md:items-end gap-2 md:pr-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Phone size={18} className="text-cyan-300" />
              <a href="tel:+380443338948" className="hover:text-cyan-300 transition">+38 (044) 333-8948</a>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 text-[11px] md:text-xs font-semibold text-slate-100 bg-slate-900/70 rounded-full border border-slate-700">LaFamiglia в соцмережах</span>
              <a href="https://www.instagram.com/rentco.com.ua/" target="_blank" rel="noopener noreferrer" className="text-[#E4405F] hover:text-cyan-300 transition" aria-label="Instagram">
                <Instagram size={22} />
              </a>
              <a href="https://www.pinterest.com/rentcokiev/" target="_blank" rel="noopener noreferrer" className="text-[#E60023] hover:text-cyan-300 transition font-bold text-sm" aria-label="Pinterest">
                P
              </a>
              <a href="https://www.facebook.com/RENTCOKiev/" target="_blank" rel="noopener noreferrer" className="text-[#1877F2] hover:text-cyan-300 transition" aria-label="Facebook">
                <Facebook size={22} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-16 z-40 bg-transparent py-4 -mx-6 px-6 mb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-3">
          <style>{`
            .category-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            ref={topCategoriesRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-2 scroll-smooth category-scroll cursor-grab active:cursor-grabbing select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={handleDragStart(topCategoriesRef)}
            onMouseMove={handleDragMove(topCategoriesRef)}
            onMouseLeave={stopDragging}
          >
            <button
              className={`group w-[96px] md:w-[112px] h-[102px] md:h-[110px] rounded-2xl border-2 px-2 py-2 flex-shrink-0 flex flex-col items-center justify-center gap-2 transition ${
                !selectedParentId && !selectedCategory
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
              }`}
              onClick={runIfNotDragging(() => {
                setSelectedParentId(null);
                setSelectedCategory(null);
              })}
              aria-label="Всі категорії"
            >
              <span className="text-lg">📋</span>
              <span className="text-[10px] md:text-[11px] font-bold uppercase">Всі</span>
            </button>

            {topCategories.length > 0 && topCategories.map((category) => {
              const hasChildren = categories.some((item) => item.parentId === category.id);
              const isActive = selectedParentId === category.id || selectedCategory === category.name;
              const icon = category.icon;
              const isImg = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:') || /\.(png|jpe?g|webp|gif|svg)$/i.test(icon));

              return (
                <button
                  key={category.id}
                  className={`group w-[104px] md:w-[120px] h-[102px] md:h-[110px] rounded-2xl border-2 overflow-hidden flex-shrink-0 bg-white transition ${
                    isActive ? 'border-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={runIfNotDragging(() => {
                    setSelectedParentId(category.id);
                    if (hasChildren) {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory(category.name);
                    }
                  })}
                  aria-label={category.name}
                >
                  <div className="h-14 md:h-16 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {isImg ? (
                      <div className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${icon})` }} />
                    ) : (
                      <span className="text-2xl">{icon || '🏷️'}</span>
                    )}
                  </div>
                  <div className={`h-[40px] md:h-[42px] px-2 py-1 text-[10px] md:text-[11px] font-bold uppercase leading-tight flex items-center justify-center ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    <span className="clamp-2 text-center">{category.name}</span>
                  </div>
                </button>
              );
            })}

            {topCategories.length === 0 && (
              <span className="text-slate-500 text-sm ml-4">Категорій немає</span>
            )}
          </div>

          {activeSubcategories.length > 0 && (
            <div
              ref={subcategoriesRef}
              className="flex items-center gap-2 overflow-x-auto pb-1 category-scroll cursor-grab active:cursor-grabbing select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={handleDragStart(subcategoriesRef)}
              onMouseMove={handleDragMove(subcategoriesRef)}
              onMouseLeave={stopDragging}
            >
              {activeSubcategories.map((subcategory) => {
                const isActive = selectedCategory === subcategory.name;
                return (
                  <button
                    key={subcategory.id}
                    onClick={runIfNotDragging(() => {
                      setSelectedParentId(subcategory.parentId || null);
                      setSelectedCategory(subcategory.name);
                    })}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {subcategory.name}
                  </button>
                );
              })}
            </div>
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
              className="group cursor-pointer rounded-3xl border-[2px] border-[#0b1731] bg-[#0b1731] p-[4px] shadow-lg shadow-slate-950/20 flex flex-col h-full"
            >
              {/* Image Tile with beige border (square) */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 mb-1 shadow-sm group-hover:shadow-xl transition-all border-[2px] border-[#0b1731]">
                {/* Availability Banner (attached, with rounded top-left) */}
                <div className="absolute -top-[3px] -left-[3px] z-10">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-tl-2xl rounded-br-xl bg-[#0b1731] text-white tracking-wide">
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
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-4xl">
                    📦
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1">
                {/* Категорія emoji/іконка */}
                {category && category.icon && (
                  <div className="flex justify-center mb-1">
                    <span className="text-3xl">{category.icon}</span>
                  </div>
                )}
                {/* Product Info */}
                <h3 className="text-sm md:text-base font-bold text-white uppercase line-clamp-2 min-h-[48px]">
                  {product.name}
                </h3>
                {product.sku && (
                  <p className="text-xs font-mono text-slate-400 mb-1">Артикул: {product.sku}</p>
                )}
                <p className="text-slate-200 text-xs line-clamp-2 min-h-[32px] mb-2">{product.description}</p>
                <p className="text-lg font-bold text-white mt-auto pt-1 ml-auto text-right">
                  {product.price} ₴ <span className="text-xs text-slate-300 font-normal">/од/доба</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Products */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-300 text-lg mb-4">Товарів немає у цій категорії</p>
          <button
            onClick={() => {
              setSelectedParentId(null);
              setSelectedCategory(null);
            }}
            className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-xl font-bold hover:bg-cyan-400"
          >
            Переглянути всі товари
          </button>
        </div>
      )}
    </main>
  );
};
