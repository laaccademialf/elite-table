import React, { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
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
    addToCart,
    cart,
    setCartQuantity,
    removeFromCart,
  } = useAppContext();

  const [selectedParentId, setSelectedParentId] = useState(null);
  const [isCategoryBarSolid, setIsCategoryBarSolid] = useState(false);
  const [cardQuantities, setCardQuantities] = useState({});
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
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

  useEffect(() => {
    const handleScrollState = () => {
      setIsCategoryBarSolid(window.scrollY > 120);
    };

    handleScrollState();
    window.addEventListener('scroll', handleScrollState, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollState);
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

  const updateCardQuantity = (productId, nextValue, maxValue) => {
    const normalizedMax = Number.isFinite(maxValue) ? Math.max(0, maxValue) : Number.MAX_SAFE_INTEGER;
    const parsed = parseInt(nextValue, 10);
    const safeValue = Number.isNaN(parsed) ? 1 : parsed;
    const clamped = normalizedMax > 0 ? Math.min(Math.max(1, safeValue), normalizedMax) : 1;

    setCardQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  useEffect(() => {
    setCardQuantities((prev) => {
      const next = { ...prev };
      cart.forEach((item) => {
        next[item.id] = Math.max(1, Number(item.quantity || 1));
      });
      return next;
    });
  }, [cart]);

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
    <main className="w-full pt-0 pb-8 animate-in fade-in duration-700 text-slate-900">
      {/* Hero Section */}
      <div className="relative z-30 mb-0 bg-white border-b border-slate-200 min-h-[180px]">
        {/* Watermark — decorative, left side */}
        <img
          src="/La%20FAMIGLIA.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-4 bottom-4 select-none z-0 h-[60%] w-auto max-w-[40%] object-contain object-left-bottom"
          style={{ opacity: 0.5 }}
          draggable="false"
        />

        {/* Right — sketch illustration, decorative */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[400px] lg:w-[520px] z-0 overflow-hidden pointer-events-none">
          <img
            src="/7a18ac806e32de0744a57d15932bd1200b83093d.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-left-bottom"
            draggable="false"
          />
        </div>

        {/* Center — text + date picker, truly centered on full width */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-2 py-8 md:py-10 px-8">
          <h2
            className="text-3xl md:text-[44px] font-bold text-[#131C4E] uppercase leading-tight text-center"
            style={{ fontFamily: "'Open Sans', sans-serif", letterSpacing: '-0.01em' }}
          >
            ВСЕ ДЛЯ ВАШОЇ ПОДІЇ
          </h2>
          <p className="text-slate-500 text-sm md:text-[15px] text-center" style={{ fontFamily: "'Open Sans', sans-serif" }}>
            Оберіть <strong className="text-[#131C4E]">дату</strong>, щоб почати магію сервірування
          </p>
          <div className="mt-3">
            <DateRangePicker value={globalDates} onChange={setGlobalDates} />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-16 z-20 mb-6 transition-all duration-500 ease-out -mt-px">
        <div className={`w-full pt-0 pb-3 overflow-visible transition-all duration-500 ease-out border-b-[3px] border-slate-800/80 ${
          isCategoryBarSolid
            ? 'bg-[#131C4E]/95 backdrop-blur-md shadow-xl'
            : 'bg-transparent'
        }`}>
          <div className="w-full px-6 pt-3 space-y-3">
          <style>{`
            .category-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            ref={topCategoriesRef}
            className="overflow-x-auto scroll-smooth category-scroll cursor-grab active:cursor-grabbing select-none pt-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={handleDragStart(topCategoriesRef)}
            onMouseMove={handleDragMove(topCategoriesRef)}
            onMouseLeave={stopDragging}
          >
            <div className="flex w-max min-w-full items-stretch justify-center gap-3 px-3 pb-2">
              <button
                className="group w-[96px] md:w-[112px] h-[102px] md:h-[110px] rounded-2xl border-2 px-2 py-2 flex-shrink-0 flex flex-col items-center justify-center border-[rgba(148,163,184,0.45)] bg-white text-slate-900 transition-all duration-200 ease-out hover:scale-[1.04] hover:shadow-lg hover:border-[#131C4E]"
                onClick={runIfNotDragging(() => {
                  setSelectedParentId(null);
                  setSelectedCategory(null);
                })}
                aria-label="Всі категорії"
              >
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
                    className={`group w-[104px] md:w-[120px] h-[102px] md:h-[110px] rounded-2xl border-2 overflow-hidden flex-shrink-0 bg-white transition-all duration-200 ease-out ${
                      isActive ? 'border-[#131C4E] shadow-md' : 'border-[rgba(148,163,184,0.45)] hover:scale-[1.04] hover:shadow-lg hover:border-[#131C4E]'
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
                    <div className={`h-[40px] md:h-[42px] px-2 py-1 text-[10px] md:text-[11px] font-bold uppercase leading-tight flex items-center justify-center transition-colors duration-200 bg-white ${
                      isActive
                        ? 'text-slate-900'
                        : 'text-slate-700'
                    }`}>
                      <span className="clamp-2 text-center">{category.name}</span>
                    </div>
                  </button>
                );
              })}

              {topCategories.length === 0 && (
                <span className="text-slate-500 text-sm ml-4">Категорій немає</span>
              )}
            </div>
          </div>

          {activeSubcategories.length > 0 && (
            <div
              ref={subcategoriesRef}
              className="overflow-x-auto category-scroll cursor-grab active:cursor-grabbing select-none pt-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={handleDragStart(subcategoriesRef)}
              onMouseMove={handleDragMove(subcategoriesRef)}
              onMouseLeave={stopDragging}
            >
              <div className="flex w-max min-w-full items-center justify-center gap-2 px-3 pb-1">
                {activeSubcategories.map((subcategory) => {
                  const isActive = selectedCategory === subcategory.name;
                  return (
                    <button
                      key={subcategory.id}
                      onClick={runIfNotDragging(() => {
                        setSelectedParentId(subcategory.parentId || null);
                        setSelectedCategory(subcategory.name);
                      })}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out ${
                        isActive
                          ? 'border-[#131C4E] bg-[#131C4E] text-white'
                          : 'border-[rgba(148,163,184,0.45)] bg-white text-slate-700 hover:scale-105 hover:shadow-md hover:border-[#131C4E] hover:text-slate-900'
                      }`}
                    >
                      {subcategory.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="w-full px-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-5 mb-12">
        {filteredProducts.map(product => {
          // Знаходимо категорію продукту
          const category = categories.find(cat => cat.id === product.categoryId);
          const rawMaxAvailable = globalDates.start
            ? availabilityMap[product.id] ?? product.quantity ?? 0
            : product.quantity ?? 0;
          const maxAvailable = Math.max(0, Number(rawMaxAvailable || 0));
          const cartItem = cart.find((item) => item.id === product.id);
          const inCartQty = Math.max(0, Number(cartItem?.quantity || 0));
          const isInCart = inCartQty > 0;
          const selectedQty = Math.min(
            Math.max(1, Number(cardQuantities[product.id] || inCartQty || 1)),
            maxAvailable > 0 ? maxAvailable : 1
          );
          const displayQty = isInCart ? inCartQty : selectedQty;
          const isUnavailable = maxAvailable <= 0;
          const availabilityLabel = globalDates.start
            ? ((availabilityMap[product.id] ?? null) === null
                ? '...'
                : (availabilityMap[product.id] > 0
                    ? `${availabilityMap[product.id]} доступно`
                    : 'Недоступно'))
            : (product.quantity > 0 ? `${product.quantity} в наявності` : 'Немає');

          return (
            <div 
              key={product.id} 
              onClick={() => {
                setSelectedItem(product);
                setView('item');
                window.scrollTo(0, 0);
              }}
              className="group cursor-pointer rounded-2xl border bg-white flex flex-col h-full transition-all duration-200 hover:shadow-lg"
              style={{ borderColor: 'rgba(19,28,78,0.15)', borderWidth: '0.5px' }}
            >
              {/* Image */}
              <div className="relative aspect-square rounded-t-2xl overflow-hidden bg-slate-50">
                <div className="absolute left-2 top-2 z-10">
                  <div className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    isUnavailable
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-white/90 text-[#131C4E] border border-[rgba(19,28,78,0.2)]'
                  }`} style={{ borderWidth: '0.5px' }}>
                    {availabilityLabel}
                  </div>
                </div>
                {product.image ? (
                  <SafeImage
                    src={product.image}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">
                    📦
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3">
                {product.sku && (
                  <p className="text-[11px] text-slate-400 mb-1" style={{ fontFamily: "'Open Sans', sans-serif" }}>{product.sku}</p>
                )}
                {!product.sku && product.description && (
                  <p className="text-[11px] text-slate-400 mb-1 line-clamp-1">{product.description}</p>
                )}
                <h3
                  className="text-sm font-bold text-[#131C4E] uppercase line-clamp-2 leading-snug min-h-[38px]"
                  style={{ fontFamily: "'Open Sans', sans-serif" }}
                >
                  {product.name}
                </h3>

                <div className="mt-2 mb-3 flex items-baseline gap-1.5">
                  <span className="text-[15px] font-bold text-[#131C4E]" style={{ fontFamily: "'Open Sans', sans-serif" }}>{product.price} грн</span>
                  <span className="text-[11px] text-slate-400" style={{ fontFamily: "'Open Sans', sans-serif" }}>одиниця</span>
                </div>

                <div
                  className="mt-auto flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Qty control */}
                  <div
                    className="flex items-center rounded-full bg-[#F9F9FF] overflow-hidden"
                    style={{ border: '0.5px solid rgba(19,28,78,0.25)' }}
                  >
                    <button
                      type="button"
                      aria-label="Зменшити кількість"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInCart) {
                          const nextQty = inCartQty - 1;
                          if (nextQty <= 0) {
                            removeFromCart(product.id);
                            setCardQuantities((prev) => ({ ...prev, [product.id]: 1 }));
                          } else {
                            setCartQuantity(product.id, nextQty);
                          }
                          return;
                        }
                        updateCardQuantity(product.id, displayQty - 1, maxAvailable);
                      }}
                      className="h-8 w-8 flex items-center justify-center text-[#131C4E] hover:bg-[#eef0fb] transition-colors text-base font-light"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxAvailable > 0 ? maxAvailable : 1}
                      value={displayQty}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (isInCart) {
                          const nextQty = Math.max(1, Math.min(maxAvailable || 1, Number(e.target.value) || 1));
                          setCartQuantity(product.id, nextQty);
                          return;
                        }
                        updateCardQuantity(product.id, e.target.value, maxAvailable);
                      }}
                      className="w-8 bg-transparent text-center text-sm font-semibold text-[#131C4E] outline-none border-0"
                    />
                    <button
                      type="button"
                      aria-label="Збільшити кількість"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInCart) {
                          setCartQuantity(product.id, Math.min(maxAvailable, inCartQty + 1));
                          return;
                        }
                        updateCardQuantity(product.id, displayQty + 1, maxAvailable);
                      }}
                      disabled={isUnavailable || displayQty >= maxAvailable}
                      className="h-8 w-8 flex items-center justify-center text-[#131C4E] hover:bg-[#eef0fb] transition-colors disabled:opacity-40"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Cart button */}
                  <button
                    type="button"
                    title={isUnavailable ? 'Товар недоступний' : isInCart ? 'Перейти в кошик' : 'Додати в кошик'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isInCart) { setView('cart'); return; }
                      addToCart(product, selectedQty);
                      setRecentlyAddedId(product.id);
                      window.setTimeout(() => {
                        setRecentlyAddedId((current) => (current === product.id ? null : current));
                      }, 260);
                    }}
                    disabled={isUnavailable}
                    className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isInCart
                        ? 'bg-[#131C4E] text-white'
                        : 'bg-[#F9F9FF] text-[#131C4E] hover:bg-[#131C4E] hover:text-white'
                    } ${recentlyAddedId === product.id ? 'scale-110' : ''}`}
                    style={{ border: '0.5px solid rgba(19,28,78,0.3)' }}
                  >
                    {isInCart ? <Check size={15} /> : <ShoppingCart size={15} />}
                    {isInCart && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-white text-[#131C4E] text-[9px] leading-4 text-center font-bold" style={{ border: '0.5px solid rgba(19,28,78,0.3)' }}>
                        {inCartQty}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Products */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg mb-4">Товарів немає у цій категорії</p>
          <button
            onClick={() => {
              setSelectedParentId(null);
              setSelectedCategory(null);
            }}
            className="px-6 py-3 bg-[#131C4E] text-white rounded-xl font-bold border border-slate-700 hover:bg-[#1a2766] transition-colors"
          >
            Переглянути всі товари
          </button>
        </div>
      )}
      </div>
    </main>
  );
};
