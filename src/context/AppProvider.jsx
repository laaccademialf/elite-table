import { collection, onSnapshot, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { AppContext } from "./AppContextDefinition";
import {
  getCurrentUser,
  getProducts,
  getOrders,
  createOrder,
  logoutUser,
    getAvailableQuantity,
} from "../services/firebase";

export function AppProvider({ children }) {
    // Categories
    const [categories, setCategories] = useState([]);
    // Live categories sync
    useEffect(() => {
      try {
        // НЕ використовуємо orderBy, щоб отримати всі категорії, навіть без order
        const unsubscribe = onSnapshot(
          collection(db, 'categories'),
          (snapshot) => {
            const fetchedCategories = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Сортуємо на клієнті
            const sorted = fetchedCategories.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
            console.log('[AppProvider] Firestore categories:', sorted);
            setCategories(sorted);
            localStorage.setItem('elite_table_categories', JSON.stringify(sorted));
          },
          (error) => {
            console.error('[AppProvider] Error loading categories:', error);
            // Спробуємо з localStorage кеш
            const cached = localStorage.getItem('elite_table_categories');
            if (cached) {
              try {
                setCategories(JSON.parse(cached));
                console.log('[AppProvider] Using cached categories from localStorage');
                return;
              } catch (e) {
                console.error('[AppProvider] Error parsing cached categories:', e);
              }
            }
            // Якщо помилка, спробуємо getDocs без orderBy
            getDocs(collection(db, 'categories'))
              .then((snapshot) => {
                const fetchedCategories = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                const sorted = fetchedCategories.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
                console.log('[AppProvider] Categories loaded via getDocs:', sorted);
                setCategories(sorted);
                localStorage.setItem('elite_table_categories', JSON.stringify(sorted));
              })
              .catch((err) => {
                console.error('[AppProvider] Failed to load categories:', err);
              });
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error('[AppProvider] Error setting up categories listener:', error);
        // Fallback на localStorage
        const cached = localStorage.getItem('elite_table_categories');
        if (cached) {
          try {
            setCategories(JSON.parse(cached));
            console.log('[AppProvider] Using cached categories from localStorage (error fallback)');
          } catch (e) {
            console.error('[AppProvider] Error parsing cached categories:', e);
          }
        }
      }
    }, []);
  // Authentication
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Data
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // UI
  const [view, setView] = useState("home");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState("inventory");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Notifications
  const [pendingBadge, setPendingBadge] = useState(0);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('pendingSoundEnabled');
    return saved !== 'false';
  });
  const [soundType, setSoundType] = useState(() => {
    if (typeof window === 'undefined') return 'bell';
    return localStorage.getItem('pendingSoundType') || 'bell';
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pendingPushEnabled') === 'true';
  });
  const pendingInitialLoad = useRef(false);
  const windowFocused = useRef(true);

  // Booking
  const [globalDates, setGlobalDates] = useState({ start: null, end: null });
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    notes: "",
  });
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [bookingStatus, setBookingStatus] = useState("idle");

  // Persistence keys
  const CART_STORAGE_KEY = 'elite_table_cart_v1';
  const DATES_STORAGE_KEY = 'elite_table_dates_v1';
  const EXTRA_SERVICES_STORAGE_KEY = 'elite_table_extra_services_cache_v1';
  const SELECTED_SERVICES_STORAGE_KEY = 'elite_table_selected_services_v1';

  // Load persisted cart, dates, and selected services on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const cachedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (cachedCart) {
        const parsed = JSON.parse(cachedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
      const cachedDates = localStorage.getItem(DATES_STORAGE_KEY);
      if (cachedDates) {
        const parsedDates = JSON.parse(cachedDates);
        if (parsedDates && typeof parsedDates === 'object') setGlobalDates(parsedDates);
      }
      const cachedServices = localStorage.getItem(EXTRA_SERVICES_STORAGE_KEY);
      if (cachedServices) {
        const parsedServices = JSON.parse(cachedServices);
        if (Array.isArray(parsedServices)) setExtraServices(parsedServices);
      }
      const cachedSelectedServices = localStorage.getItem(SELECTED_SERVICES_STORAGE_KEY);
      if (cachedSelectedServices) {
        const parsedSelectedServices = JSON.parse(cachedSelectedServices);
        if (Array.isArray(parsedSelectedServices)) setSelectedServiceIds(parsedSelectedServices);
      }
    } catch (e) {
      console.warn('[AppProvider] Failed to load persisted cart/dates/services', e);
    }
  }, []);

  // Persist cart on change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('[AppProvider] Failed to persist cart', e);
    }
  }, [cart]);

  // Persist dates on change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(globalDates));
    } catch (e) {
      console.warn('[AppProvider] Failed to persist dates', e);
    }
  }, [globalDates]);

  // Live extra services sync
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'extra_services'),
        (snapshot) => {
          const fetchedServices = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

          setExtraServices(fetchedServices);
          if (typeof window !== 'undefined') {
            localStorage.setItem(EXTRA_SERVICES_STORAGE_KEY, JSON.stringify(fetchedServices));
          }
        },
        (error) => {
          console.error('[AppProvider] Error loading extra services:', error);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('[AppProvider] Error setting up extra services listener:', error);
    }
  }, []);

  // Persist selected extra services on change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(SELECTED_SERVICES_STORAGE_KEY, JSON.stringify(selectedServiceIds));
    } catch (e) {
      console.warn('[AppProvider] Failed to persist selected services', e);
    }
  }, [selectedServiceIds]);

  // Keep only active services selected
  useEffect(() => {
    setSelectedServiceIds((prev) => {
      const next = prev.filter((id) => extraServices.some((service) => service.id === id && service.active !== false));
      return next.length === prev.length ? prev : next;
    });
  }, [extraServices]);

  // AI Features
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiConcept, setAiConcept] = useState(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        setIsAdminMode(user?.role === "manager");
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const filters = selectedCategory && selectedCategory !== "Всі" ? { category: selectedCategory } : {};
        const data = await getProducts(filters);
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
        // Fallbacks for unauthenticated users or read errors
        try {
          const res = await fetch('/products.json');
          if (res.ok) {
            const staticProducts = await res.json();
            setProducts(staticProducts);
            console.log('[AppProvider] Using public products.json fallback');
            return;
          }
        } catch {}
        try {
          const { INITIAL_ITEMS } = await import('../constants/initialData.js');
          // Map INITIAL_ITEMS to product shape used in app
          const mapped = INITIAL_ITEMS.map((it) => ({
            id: String(it.id),
            name: it.title,
            description: it.description,
            price: it.price,
            quantity: it.count,
            category: it.category,
            image: it.image,
            sku: it.sku || '',
          }));
          console.log('[AppProvider] Mapped products with SKU:', mapped);
          setProducts(mapped);
          console.log('[AppProvider] Using INITIAL_ITEMS fallback');
        } catch (e2) {
          console.error('[AppProvider] No product fallbacks available', e2);
        }
      }
    };

    loadProducts();
  }, [selectedCategory]);

  // Helper: play different sound types
  const playSound = (type = soundType) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      switch (type) {
        case 'bell': // High-pitched bell
          osc.type = 'triangle';
          osc.frequency.value = 1200;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          osc.start();
          osc.stop(now + 0.35);
          break;
        case 'alarm': // Loud alarm
          osc.type = 'square';
          osc.frequency.value = 800;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
          osc.start();
          osc.stop(now + 0.55);
          break;
        case 'chime': // Melodic chime (two notes)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1046, now); // C6
          osc.frequency.setValueAtTime(1319, now + 0.15); // E6
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          osc.start();
          osc.stop(now + 0.4);
          break;
        default:
          osc.type = 'triangle';
          osc.frequency.value = 1200;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          osc.start();
          osc.stop(now + 0.35);
      }
    } catch (err) {
      console.warn('Sound playback failed', err);
    }
  };

  // Push notification helper
  const showPushNotification = (title, options = {}) => {
    if (!pushEnabled || !windowFocused.current || typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'pending-order',
        ...options,
      });
    }
  };

  // Track window focus
  useEffect(() => {
    const handleFocus = () => { windowFocused.current = true; };
    const handleBlur = () => { windowFocused.current = false; };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Listen pending orders for managers (anywhere in app)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'manager') {
      setPendingBadge(0);
      setPendingNotifications([]);
      return;
    }
    pendingInitialLoad.current = false;
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPendingBadge(snapshot.size || 0);
      const isInitial = !pendingInitialLoad.current;
      if (!pendingInitialLoad.current) pendingInitialLoad.current = true;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          if (isInitial) return; // не сповіщаємо про існуючі на старті
          const data = change.doc.data();
          const customerName = (data.customerName && data.customerName.trim())
            || (data.customerEmail ? data.customerEmail.split('@')[0] : null)
            || data.customerPhone
            || 'Новий клієнт';
          const contactPhone = data.customerPhone || '';
          const contactEmail = data.customerEmail || '';
          const notif = {
            id: `${change.doc.id}-${Date.now()}`,
            orderId: change.doc.id,
            customer: customerName,
            contactPhone,
            contactEmail,
            total: data.totalPrice || data.totalAmount || data.total || 0,
          };
          setPendingNotifications((prev) => [notif, ...prev].slice(0, 4));
          // Show push notification if window not focused
          if (!windowFocused.current) {
            showPushNotification('Нове замовлення', {
              body: `${customerName} · ${notif.total.toFixed(0)} ₴`,
            });
          }
        }
      });
    }, (err) => console.error('[AppProvider] pending listener error', err));

    return () => unsub();
  }, [currentUser]);

  // Periodic sound when there are pending orders
  useEffect(() => {
    if (!soundEnabled || pendingBadge === 0) return;
    // одразу пінг
    playSound(soundType);
    const id = setInterval(() => {
      if (pendingBadge > 0) playSound(soundType);
    }, 5000);
    return () => clearInterval(id);
  }, [pendingBadge, soundEnabled, soundType]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingSoundEnabled', String(next));
      }
      return next;
    });
  };

  const updateSoundType = (type) => {
    setSoundType(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingSoundType', type);
    }
  };

  const togglePushNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не підтримує сповіщення');
      return;
    }
    
    if (!pushEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingPushEnabled', 'true');
        }
      } else {
        alert('Дозвіл на сповіщення не надано');
      }
    } else {
      setPushEnabled(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingPushEnabled', 'false');
      }
    }
  };

  // Remove notification with optional fade delay
  const removeNotification = (notificationId, delayMs = 3000) => {
    const performRemoval = () => {
      setPendingNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        console.log('[AppProvider] removeNotification: removed', notificationId, 'remaining:', updated.length);
        return updated;
      });
    };
    
    if (delayMs > 0) {
      setTimeout(performRemoval, delayMs);
    } else {
      performRemoval();
    }
  };

  // Auto-remove notifications for orders that are no longer pending
  useEffect(() => {
    if (pendingNotifications.length === 0) return;
    setPendingNotifications((prev) => 
      prev.filter((notif) => {
        const order = orders.find((o) => o.id === notif.orderId);
        // If order exists and is no longer pending, filter it out
        if (order && order.status !== 'pending') {
          return false;
        }
        return true;
      })
    );
  }, [orders]);

  // Load user's orders
  useEffect(() => {
    if (!currentUser) return;

    const loadOrders = async () => {
      try {
        let userOrders = [];
        if (currentUser.uid) {
          userOrders = await getOrders({ userId: currentUser.uid });
        }
        // Якщо не знайдено або userId не записався, шукаємо напряму за email
        if ((!userOrders || userOrders.length === 0) && currentUser.email) {
          userOrders = await getOrders({ customerEmail: currentUser.email });
        }
        setOrders(userOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
      }
    };

    loadOrders();
  }, [currentUser]);


  const getDaysInRange = (start, end) => {
    if (!start) return 0;
    const startDate = new Date(start.year, start.month, start.day);
    const endDate = end ? new Date(end.year, end.month, end.day) : startDate;
    return Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
  };

  const rentalDays = useMemo(
    () => getDaysInRange(globalDates.start, globalDates.end),
    [globalDates.start, globalDates.end]
  );

  const selectedExtraServices = useMemo(() => {
    return extraServices
      .filter((service) => service.active !== false && selectedServiceIds.includes(service.id))
      .map((service) => {
        const price = Number(service.price || 0);
        const total = service.billingType === 'per_day' ? price * rentalDays : price;
        return {
          ...service,
          total,
        };
      });
  }, [extraServices, selectedServiceIds, rentalDays]);

  const cartTotals = useMemo(() => {
    const itemsSubtotal = cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0) * rentalDays,
      0
    );
    const extraServicesTotal = selectedExtraServices.reduce(
      (sum, service) => sum + Number(service.total || 0),
      0
    );

    return {
      rentalDays,
      itemsSubtotal,
      extraServicesTotal,
      grandTotal: itemsSubtotal + extraServicesTotal,
    };
  }, [cart, rentalDays, selectedExtraServices]);

  const toggleExtraService = (serviceId) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const clearSelectedServices = () => {
    setSelectedServiceIds([]);
  };

  // Cart functions
  const addToCart = (product, quantity) => {
    if (!globalDates.start) {
      alert("Спочатку оберіть дату події");
      return;
    }
    const qty = parseInt(quantity) || 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.id === product.id ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    setOrderQuantity("1");
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
    setAiConcept(null);
  };

  const setCartQuantity = (id, quantity) => {
    const q = Math.max(1, parseInt(quantity) || 1);
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: q } : c)));
  };

  const handleOrderSubmit = async (e, autoRegUserId = null) => {
    e.preventDefault();

    // Якщо користувач не залогінений, дозволяємо оформлення як гість
    // (userId не передаємо, тільки контактні дані)

    const days = cartTotals.rentalDays;
    const itemsSubtotal = cartTotals.itemsSubtotal;
    const normalizedExtraServices = selectedExtraServices.map((service) => ({
      serviceId: service.id,
      name: service.name,
      description: service.description || '',
      price: Number(service.price || 0),
      billingType: service.billingType || 'fixed',
      total: Number(service.total || 0),
    }));
    const servicesTotal = normalizedExtraServices.reduce((sum, service) => sum + Number(service.total || 0), 0);
    const totalPrice = itemsSubtotal + servicesTotal;

    try {
      setBookingStatus("loading");

      if (cart.length === 0) {
        alert('Ваш кошик порожній.');
        setBookingStatus('idle');
        return;
      }

      // Перевіряємо доступність кожної позиції перед створенням замовлення
      if (!globalDates.start) {
        alert('Будь ласка, оберіть дату події.');
        setBookingStatus('idle');
        return;
      }
      for (const item of cart) {
        const available = await getMaxAvailableForRange(item.id, globalDates.start, globalDates.end);
        if (item.quantity > available) {
          setBookingStatus('error');
          alert(`Недостатньо товару: ${item.title || item.name}. В кошику ${item.quantity}, доступно ${available} на обрані дати.`);
          return;
        }
      }

      // Якщо користувач залогінений, підставляємо дані з профілю якщо поля порожні
      const email = customerInfo.email || currentUser?.email || "";
      const emailName = email ? email.split('@')[0] : "";
      const name = customerInfo.name || currentUser?.name || currentUser?.displayName || emailName;
      const phone = customerInfo.phone || currentUser?.phone || "";

      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name || item.title,
          sku: item.sku || '',
          quantity: item.quantity,
          price: item.price,
          category: item.category || 'Інше',
        })),
        itemsSubtotal,
        extraServices: normalizedExtraServices,
        servicesTotal,
        rentalDays: days,
        totalPrice,
        eventDate: globalDates.start ? `${globalDates.start.day}.${globalDates.start.month+1}.${globalDates.start.year}` : '',
        eventEndDate: globalDates.end ? `${globalDates.end.day}.${globalDates.end.month+1}.${globalDates.end.year}` : '',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: customerInfo.address,
        notes: customerInfo.notes || '',
      };
      // Передаємо userId: або з контексту, або з авто-реєстрації (мобільний)
      if ((currentUser && currentUser.uid) || autoRegUserId) {
        orderPayload.userId = autoRegUserId || currentUser.uid;
      }

      await createOrder(orderPayload);

      setBookingStatus("success");
      setCart([]);
      clearSelectedServices();
      setCustomerInfo({ name: "", phone: "", address: "", email: "", notes: "" });
      setGlobalDates({ start: null, end: null });
      // Clear persisted cart and dates
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(DATES_STORAGE_KEY);
          localStorage.removeItem(SELECTED_SERVICES_STORAGE_KEY);
        }
      } catch {}

      // Якщо залогінений — оновлюємо currentUser і замовлення, одразу переводимо на orders
      const userIdForFetch = autoRegUserId || (currentUser && currentUser.uid);
      if (userIdForFetch && typeof refreshUser === 'function') {
        await refreshUser();
        const updatedOrders = await getOrders({ userId: userIdForFetch });
        setOrders(updatedOrders);
        setView("orders");
      } else {
        setView("home");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      setBookingStatus("error");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setCart([]);
      clearSelectedServices();
      setOrders([]);
      setView("home");
      // Clear persisted cart and dates on logout
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(DATES_STORAGE_KEY);
          localStorage.removeItem(SELECTED_SERVICES_STORAGE_KEY);
        }
      } catch {}
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Refresh user after login
  const refreshUser = async () => {
    try {
      const user = await getCurrentUser();
      console.log('[AppProvider] refreshUser result:', user);
      setCurrentUser(user);
      setIsAdminMode(user?.role === "manager");
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const getAvailabilityForDate = () => {
    return 0;
  };
  const getMaxAvailableForRange = async (productId, startDate, endDate) => {
    // If dates are not selected yet, return the product's total quantity (actual stock)
    if (!productId) return 0;
    if (!startDate) {
      const p = Array.isArray(products) ? products.find((pr) => pr.id === productId) : null;
      return Number(p?.quantity ?? 0);
    }
    try {
      // Convert date objects to strings if needed
      const start = typeof startDate === 'string' ? startDate : 
        `${startDate.day}.${startDate.month + 1}.${startDate.year}`;
      const end = endDate ? (typeof endDate === 'string' ? endDate : 
        `${endDate.day}.${endDate.month + 1}.${endDate.year}`) : start;
      
      console.log(`[AppProvider.getMaxAvailableForRange] Calling getAvailableQuantity for productId=${productId}, start=${start}, end=${end}`);
      const available = await getAvailableQuantity(productId, start, end);
      console.log(`[AppProvider.getMaxAvailableForRange] Got available=${available}`);
      return typeof available === 'number' ? available : 0;
    } catch (error) {
      console.error('Error getting max available:', error);
      const p = Array.isArray(products) ? products.find((pr) => pr.id === productId) : null;
      return Number(p?.quantity ?? 0);
    }
  };

  const value = {
    // Auth
    currentUser,
    userLoading,
    handleLogout,
    refreshUser,

    // Data
    products,
    orders,
    cart,
    extraServices,
    selectedServiceIds,
    selectedExtraServices,
    cartTotals,
    selectedItem,
    selectedCategory,
    categories,

    // UI
    view,
    setView,
    isAdminMode,
    setIsAdminMode,
    adminTab,
    setAdminTab,

    // Booking
    globalDates,
    setGlobalDates,
    customerInfo,
    setCustomerInfo,
    orderQuantity,
    setOrderQuantity,
    bookingStatus,
    setBookingStatus,

    // AI Features
    isGenerating,
    setIsGenerating,
    aiConcept,
    setAiConcept,
    isTtsLoading,
    setIsTtsLoading,

    // Notifications
    pendingBadge,
    pendingNotifications,
    soundEnabled,
    toggleSound,
    soundType,
    updateSoundType,
    pushEnabled,
    togglePushNotifications,
    removeNotification,
    playSound,
    expandedOrderId,
    setExpandedOrderId,

    // Functions
    setSelectedItem,
    setSelectedCategory,
    addToCart,
    removeFromCart,
    setCartQuantity,
    toggleExtraService,
    clearSelectedServices,
    handleOrderSubmit,
    getAvailabilityForDate,
    getMaxAvailableForRange,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
