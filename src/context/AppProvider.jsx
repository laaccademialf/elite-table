import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useContext } from "react";
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
    // Live categories sync - без умови на авторизацію
    useEffect(() => {
      try {
        const unsubscribe = onSnapshot(
          collection(db, 'categories'),
          (snapshot) => {
            const fetchedCategories = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            console.log('[AppProvider] Firestore categories:', fetchedCategories);
            setCategories(fetchedCategories);
             // Зберігаємо в localStorage
             localStorage.setItem('elite_table_categories', JSON.stringify(fetchedCategories));
          },
          (error) => {
            console.error('[AppProvider] Error loading categories:', error);
             // Спочатку спробуємо з localStorage
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
            // Якщо помилка доступу, спробуємо завантажити з getDocs
            getDocs(collection(db, 'categories'))
              .then((snapshot) => {
                const fetchedCategories = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                console.log('[AppProvider] Categories loaded via getDocs:', fetchedCategories);
                setCategories(fetchedCategories);
                 localStorage.setItem('elite_table_categories', JSON.stringify(fetchedCategories));
              })
              .catch(async (err) => {
                console.error('[AppProvider] Failed to load categories:', err);
                // Остаточний публічний fallback: читаємо статичний список
                try {
                  const res = await fetch('/categories.json');
                  if (res.ok) {
                    const staticCategories = await res.json();
                    console.log('[AppProvider] Using public categories.json fallback:', staticCategories);
                    setCategories(staticCategories);
                    localStorage.setItem('elite_table_categories', JSON.stringify(staticCategories));
                  } else {
                    console.warn('[AppProvider] categories.json not found or failed to load');
                  }
                } catch (fetchErr) {
                  console.error('[AppProvider] Error fetching categories.json:', fetchErr);
                }
              });
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error('[AppProvider] Error setting up categories listener:', error);
         // Як останній fallback, використовуємо localStorage
         const cached = localStorage.getItem('elite_table_categories');
         if (cached) {
           try {
             setCategories(JSON.parse(cached));
             console.log('[AppProvider] Using cached categories from localStorage (error fallback)');
           } catch (e) {
             console.error('[AppProvider] Error parsing cached categories:', e);
           }
         }
        // А також пробуємо статичний файл
        (async () => {
          try {
            const res = await fetch('/categories.json');
            if (res.ok) {
              const staticCategories = await res.json();
              setCategories(staticCategories);
              console.log('[AppProvider] Fallback to public categories.json on error');
            }
          } catch {}
        })();
      }
    }, []);
  // Authentication
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Data
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);

  // UI
  const [view, setView] = useState("home");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState("inventory");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

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
          }));
          setProducts(mapped);
          console.log('[AppProvider] Using INITIAL_ITEMS fallback');
        } catch (e2) {
          console.error('[AppProvider] No product fallbacks available', e2);
        }
      }
    };

    loadProducts();
  }, [selectedCategory]);

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

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    // Якщо користувач не залогінений, дозволяємо оформлення як гість
    // (userId не передаємо, тільки контактні дані)

    function getDaysInRange(start, end) {
      if (!start) return 0;
      const startDate = new Date(start.year, start.month, start.day);
      const endDate = end ? new Date(end.year, end.month, end.day) : startDate;
      return Math.max(1, Math.round((endDate - startDate) / (1000*60*60*24)) + 1);
    }
    const days = getDaysInRange(globalDates.start, globalDates.end);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity * days, 0);

    try {
      setBookingStatus("loading");

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
      const name = customerInfo.name || currentUser?.name || "";
      const email = customerInfo.email || currentUser?.email || "";
      const phone = customerInfo.phone || currentUser?.phone || "";

      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice,
        eventDate: globalDates.start ? `${globalDates.start.day}.${globalDates.start.month+1}.${globalDates.start.year}` : '',
        eventEndDate: globalDates.end ? `${globalDates.end.day}.${globalDates.end.month+1}.${globalDates.end.year}` : '',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: customerInfo.address,
        notes: customerInfo.notes || '',
      };
      if (currentUser && currentUser.uid) {
        orderPayload.userId = currentUser.uid;
      }

      const orderId = await createOrder(orderPayload);

      setBookingStatus("success");
      setCart([]);
      setCustomerInfo({ name: "", phone: "", address: "", email: "", notes: "" });
      setGlobalDates({ start: null, end: null });

      // Якщо залогінений — оновлюємо currentUser і замовлення, одразу переводимо на orders
      if (currentUser && currentUser.uid && typeof refreshUser === 'function') {
        await refreshUser();
        const updatedOrders = await getOrders({ userId: currentUser.uid });
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
      setOrders([]);
      setView("home");
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

  const getAvailabilityForDate = () => 999; // Placeholder for Firebase inventory
  const getMaxAvailableForRange = async (productId, startDate, endDate) => {
    if (!productId || !startDate) return 999;
    try {
      // Convert date objects to strings if needed
      const start = typeof startDate === 'string' ? startDate : 
        `${startDate.day}.${startDate.month + 1}.${startDate.year}`;
      const end = endDate ? (typeof endDate === 'string' ? endDate : 
        `${endDate.day}.${endDate.month + 1}.${endDate.year}`) : start;
      
      console.log(`[AppProvider.getMaxAvailableForRange] Calling getAvailableQuantity for productId=${productId}, start=${start}, end=${end}`);
      const available = await getAvailableQuantity(productId, start, end);
      console.log(`[AppProvider.getMaxAvailableForRange] Got available=${available}`);
      return available;
    } catch (error) {
      console.error('Error getting max available:', error);
      return 999; // Return 999 on error, not 0 (so UI doesn't show "not available" on error)
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

    // Functions
    setSelectedItem,
    setSelectedCategory,
    addToCart,
    removeFromCart,
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
