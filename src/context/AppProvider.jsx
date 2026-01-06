import { useState, useEffect } from "react";
import { AppContext } from "./AppContextDefinition";
import {
  getCurrentUser,
  getProducts,
  getOrders,
  createOrder,
  logoutUser,
} from "../services/firebase";

export function AppProvider({ children }) {
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
  const [selectedCategory, setSelectedCategory] = useState("Всі");

  // Booking
  const [globalDates, setGlobalDates] = useState({ start: null, end: null });
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
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
        const filters = selectedCategory !== "Всі" ? { category: selectedCategory } : {};
        const data = await getProducts(filters);
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };

    loadProducts();
  }, [selectedCategory]);

  // Load user's orders
  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadOrders = async () => {
      try {
        const userOrders = await getOrders({ userId: currentUser.uid });
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

    if (!currentUser) {
      alert("Увійдіть, щоб створити замовлення");
      return;
    }

    const days = globalDates.end ? globalDates.end - globalDates.start + 1 : 1;
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity * days, 0);

    try {
      setBookingStatus("loading");

      const orderId = await createOrder({
        userId: currentUser.uid,
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice,
        eventDate: globalDates.start,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        address: customerInfo.address,
      });

      setBookingStatus("success");
      setCart([]);
      setCustomerInfo({ name: "", phone: "", address: "", email: "" });
      setGlobalDates({ start: null, end: null });

      // Reload orders
      const updatedOrders = await getOrders({ userId: currentUser.uid });
      setOrders(updatedOrders);

      setView("orders");
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

  const getAvailabilityForDate = () => 999; // Placeholder for Firebase inventory
  const getMaxAvailableForRange = () => 999;

  const value = {
    // Auth
    currentUser,
    userLoading,
    handleLogout,

    // Data
    products,
    orders,
    cart,
    selectedItem,
    selectedCategory,

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
